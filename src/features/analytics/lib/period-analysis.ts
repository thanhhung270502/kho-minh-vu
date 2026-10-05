// File thuần (bẫy 9): lọc, KPI, cơ cấu bán, CSV của phân tích theo kỳ.
// Component và scripts/test-pure-functions.ts cùng import.
import { buildCsv } from "@/shared/lib/csv";

import type { PeriodFilter } from "./period";
import type { AnalysisSettings, FlowPoint, PeriodRow } from "../types";

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

export type StockOutlook = { level: "out" | "red" | "yellow" | "ok" | "no-sales"; label: string; days: number | null };

/**
 * Trạng thái của mã theo nhịp bán TRONG KỲ: còn bao nhiêu ngày hàng = tồn cuối kỳ ÷
 * xuất TB/ngày. Ngưỡng đỏ / vàng lấy cài đặt Phân tích (như cột Còn (ngày) cũ).
 */
export function stockOutlook(row: PeriodRow, days: number, settings: AnalysisSettings): StockOutlook {
  if (row.closingStock <= 0) return { level: "out", label: "Hết hàng", days: 0 };
  const perDay = days > 0 ? row.sold / days : 0;
  if (perDay <= 0) return { level: "no-sales", label: "Không bán", days: null };
  const left = Math.floor(row.closingStock / perDay);
  const label = left < 1 ? "Còn dưới 1 ngày" : `Còn ${left.toLocaleString("vi-VN")} ngày`;
  if (left <= settings.redDays) return { level: "red", label, days: left };
  if (left <= settings.yellowDays) return { level: "yellow", label, days: left };
  return { level: "ok", label, days: left };
}

/** Cùng cột với bảng trên màn: mã, tên, nhập, xuất, tồn, xuất kỳ trước, %, TB/ngày, trạng thái. */
export function buildPeriodCsv(rows: PeriodRow[], periodText: string, days: number, settings: AnalysisSettings): Blob {
  const pct = (r: PeriodRow) => {
    const ratio = changeRatio(r.sold, r.soldPrev);
    return ratio === null ? "" : `${Math.round(ratio * 100)}%`;
  };
  return buildCsv(
    ["Kỳ", "Mã hàng", "Tên hàng", "Nhập", "Xuất", "Tồn", "Xuất kỳ trước", "Tăng/giảm", "Xuất TB/ngày", "Trạng thái"],
    rows.map((r) => [
      periodText, r.code, r.name, r.received, r.sold, r.closingStock, r.soldPrev, pct(r),
      days > 0 ? Math.round((r.sold / days) * 100) / 100 : 0, stockOutlook(r, days, settings).label,
    ]),
  );
}

const bySold = (a: PeriodRow, b: PeriodRow) => b.sold - a.sold || a.code.localeCompare(b.code);
const byClosingDesc = (a: PeriodRow, b: PeriodRow) => b.closingStock - a.closingStock || a.code.localeCompare(b.code);

/** Mã bán nhiều nhất trong kỳ. */
export function topProducts(rows: PeriodRow[], limit: number): PeriodRow[] {
  return rows.filter((r) => r.sold > 0).sort(bySold).slice(0, limit);
}

export type CategoryRank = { key: string; name: string; products: number; sold: number; soldPrev: number; share: number };

/** Nhóm hàng bán nhiều nhất; share = phần của nhóm trong tổng xuất bán của kỳ. */
export function topCategories(rows: PeriodRow[], limit: number): CategoryRank[] {
  const total = rows.reduce((s, r) => s + r.sold, 0);
  const map = new Map<string, CategoryRank>();
  for (const r of rows) {
    if (r.sold === 0 && r.soldPrev === 0) continue;
    const key = r.categoryId ?? "";
    const g = map.get(key) ?? { key: key || "(trống)", name: r.categoryName ?? "Chưa phân nhóm", products: 0, sold: 0, soldPrev: 0, share: 0 };
    if (r.sold > 0) g.products += 1;
    g.sold += r.sold;
    g.soldPrev += r.soldPrev;
    map.set(key, g);
  }
  return [...map.values()]
    .filter((g) => g.sold > 0)
    .map((g) => ({ ...g, share: total > 0 ? g.sold / total : 0 }))
    .sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name, "vi"))
    .slice(0, limit);
}

/**
 * Tăng / giảm mạnh nhất so với kỳ trước, xếp theo chênh lệch số lượng (không theo %,
 * để mã bán lẻ tẻ không chiếm chỗ). upCount / downCount đếm đủ, không bị cắt top.
 */
export function salesMovers(rows: PeriodRow[], limit: number) {
  const delta = (r: PeriodRow) => r.sold - r.soldPrev;
  const up = rows.filter((r) => delta(r) > 0).sort((a, b) => delta(b) - delta(a) || a.code.localeCompare(b.code));
  const down = rows.filter((r) => delta(r) < 0).sort((a, b) => delta(a) - delta(b) || a.code.localeCompare(b.code));
  return { up: up.slice(0, limit), down: down.slice(0, limit), upCount: up.length, downCount: down.length };
}

/**
 * Tồn chậm theo nhịp bán của kỳ: "Không bán" = còn tồn mà kỳ này không xuất bán;
 * "Tồn quá 1 năm" = tồn cuối kỳ đủ bán ≥ 365 ngày. Cả hai xếp theo tồn nhiều nhất.
 */
export function slowStock(rows: PeriodRow[], days: number, limit: number) {
  const coverDays = (r: PeriodRow) => (days > 0 && r.sold > 0 ? r.closingStock / (r.sold / days) : null);
  const noSales = rows.filter((r) => r.closingStock > 0 && r.sold <= 0).sort(byClosingDesc);
  const overstock = rows.filter((r) => r.closingStock > 0 && (coverDays(r) ?? 0) >= 365).sort(byClosingDesc);
  const qty = (list: PeriodRow[]) => list.reduce((sum, r) => sum + r.closingStock, 0);
  return {
    noSales: noSales.slice(0, limit),
    overstock: overstock.slice(0, limit).map((r) => ({ row: r, coverDays: coverDays(r) ?? 0 })),
    noSalesCount: noSales.length,
    noSalesQty: qty(noSales),
    overstockCount: overstock.length,
    overstockQty: qty(overstock),
  };
}
