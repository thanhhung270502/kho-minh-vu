// File thuần (bẫy 9): lọc, KPI, cơ cấu bán, CSV của phân tích theo kỳ.
// Component và scripts/test-pure-functions.ts cùng import.
import { buildCsv } from "@/shared/lib/csv";

import type { PeriodFilter } from "./period";
import type { FlowPoint, PeriodRow } from "../types";

const upper = (v: string | null | undefined) => (v ?? "").trim().toUpperCase();

/** Các cặp hãng/dòng của mã: cặp chính + xe dùng chung (0096). */
function vehiclesOf(row: PeriodRow) {
  return [{ brandCode: row.brandCode, modelCode: row.modelCode }, ...row.sharedVehicles];
}

/**
 * Lọc hãng / dòng tính CẢ xe dùng chung: hàng lắp được Vision lẫn Wave hiện ở cả
 * hai. Kho lọc ở RPC (tồn và luồng theo kho); các trường còn lại lọc ở đây.
 */
export function matchesPeriodFilter(row: PeriodRow, f: PeriodFilter): boolean {
  if (f.categoryId && row.categoryId !== f.categoryId) return false;
  if (f.stageId && row.stageId !== f.stageId) return false;
  if (f.partCode && upper(row.partCode) !== upper(f.partCode)) return false;
  if (f.brandCode) {
    const hit = vehiclesOf(row).some(
      (v) => upper(v.brandCode) === upper(f.brandCode) && (!f.modelCode || upper(v.modelCode) === upper(f.modelCode)),
    );
    if (!hit) return false;
  }
  return true;
}

/** % thay đổi so với kỳ trước; kỳ trước = 0 thì không tính được (null). */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export type PeriodKpis = {
  sold: number;
  soldPrev: number;
  received: number;
  receivedPrev: number;
  invoiceCount: number;
  receiptCount: number;
  /** Số mã có bán trong kỳ / kỳ trước. */
  sellingProducts: number;
  sellingProductsPrev: number;
  /** Xuất bán ÷ tồn bình quân (tồn đầu + tồn cuối) / 2. null khi tồn bình quân ≤ 0. */
  turnover: number | null;
  closingStock: number;
};

export function periodKpis(rows: PeriodRow[], series: FlowPoint[]): PeriodKpis {
  const sum = (pick: (r: PeriodRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const opening = sum((r) => r.openingStock);
  const closing = sum((r) => r.closingStock);
  const sold = sum((r) => r.sold);
  const avgStock = (opening + closing) / 2;
  return {
    sold,
    soldPrev: sum((r) => r.soldPrev),
    received: sum((r) => r.received),
    receivedPrev: sum((r) => r.receivedPrev),
    invoiceCount: series.reduce((s, p) => s + p.invoiceCount, 0),
    receiptCount: series.reduce((s, p) => s + p.receiptCount, 0),
    sellingProducts: rows.filter((r) => r.sold > 0).length,
    sellingProductsPrev: rows.filter((r) => r.soldPrev > 0).length,
    turnover: avgStock > 0 ? sold / avgStock : null,
    closingStock: closing,
  };
}

export const BREAKDOWN_DIMENSIONS = ["hang", "dong", "linh_kien", "xu_ly", "nhom"] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

export const BREAKDOWN_LABELS: Record<BreakdownDimension, string> = {
  hang: "Hãng xe",
  dong: "Dòng xe",
  linh_kien: "Linh kiện",
  xu_ly: "Xử lý",
  nhom: "Nhóm hàng",
};

/** Tên hiển thị của một mã quy chuẩn — giao diện tra bộ mã hóa rồi truyền vào. */
export type CodeNamer = {
  brand: (brandCode: string) => string;
  model: (brandCode: string, modelCode: string) => string;
  part: (partCode: string) => string;
};

export type BreakdownItem = { key: string; label: string; sold: number; soldPrev: number };

/**
 * Xuất bán gom theo một chiều. Hãng / dòng chỉ tính theo cặp CHÍNH để không đếm
 * một lần bán hai lần (hàng dùng chung vẫn lọc được theo xe phụ ở thanh lọc).
 */
export function breakdown(
  rows: PeriodRow[],
  dimension: BreakdownDimension,
  namer: CodeNamer,
  limit = 10,
): BreakdownItem[] {
  const groups = new Map<string, BreakdownItem>();
  for (const r of rows) {
    if (r.sold === 0 && r.soldPrev === 0) continue;
    let key = "";
    let label = "";
    if (dimension === "hang") {
      key = upper(r.brandCode);
      label = key ? namer.brand(key) : "";
    } else if (dimension === "dong") {
      key = r.brandCode && r.modelCode ? `${upper(r.brandCode)}|${upper(r.modelCode)}` : "";
      label = key ? `${namer.brand(upper(r.brandCode))} ${namer.model(upper(r.brandCode), upper(r.modelCode))}` : "";
    } else if (dimension === "linh_kien") {
      key = upper(r.partCode);
      label = key ? namer.part(key) : "";
    } else if (dimension === "xu_ly") {
      key = r.stageId ?? "";
      label = r.stageName ?? "";
    } else {
      key = r.categoryId ?? "";
      label = r.categoryName ?? "";
    }
    const k = key || "(trống)";
    const item = groups.get(k) ?? { key: k, label: label || "Chưa phân loại", sold: 0, soldPrev: 0 };
    item.sold += r.sold;
    item.soldPrev += r.soldPrev;
    groups.set(k, item);
  }
  return [...groups.values()].sort((a, b) => b.sold - a.sold).slice(0, limit);
}

/** Mã có phát sinh trong kỳ hoặc còn tồn — bảng mặc định ẩn mã "chết" hoàn toàn. */
export function hasActivity(r: PeriodRow): boolean {
  return (
    r.openingStock !== 0 || r.closingStock !== 0 || r.received !== 0 || r.sold !== 0 ||
    r.internalOut !== 0 || r.returned !== 0 || r.adjusted !== 0 || r.soldPrev !== 0
  );
}

export function buildPeriodCsv(rows: PeriodRow[], periodText: string): Blob {
  return buildCsv(
    ["Kỳ", "Mã hàng", "Tên hàng", "Nhóm hàng", "ĐVT", "Tồn đầu", "Nhập", "Xuất bán", "Xuất nội bộ", "Trả", "Điều chỉnh", "Tồn cuối", "Xuất bán kỳ trước"],
    rows.map((r) => [
      periodText, r.code, r.name, r.categoryName, r.unitName, r.openingStock, r.received, r.sold,
      r.internalOut, r.returned, r.adjusted, r.closingStock, r.soldPrev,
    ]),
  );
}
