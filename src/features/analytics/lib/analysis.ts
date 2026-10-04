// File thuần (bẫy 9): component và scripts/test-pure-functions.ts cùng import.
// RPC phan_tich_ton_kho trả số theo từng mã (pgTAP 98 kiểm); mọi phép gom,
// xếp hạng, tô màu của trang Phân tích nằm ở đây.
import { buildCsv } from "@/shared/lib/csv";

import {
  FINISH_LABELS,
  finishFromStageCode,
  type AnalysisRow,
  type AnalysisSettings,
  type FinishType,
} from "../types";

export const finishOf = finishFromStageCode;

/** Đề nghị nhập = ⌈ADU × Y − khả dụng⌉, âm thì 0; mã không bán không đề nghị. */
export function suggestedOrder(row: AnalysisRow, coverDays: number): number {
  if (row.avgDailySales === null) return 0;
  return Math.max(0, Math.ceil(row.avgDailySales * coverDays - row.available));
}

export type StockStatus = "out" | "urgent" | "soon" | "ok" | "no-sales" | "stopped";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out: "Hết hàng",
  urgent: "Cần nhập ngay",
  soon: "Chuẩn bị nhập",
  ok: "Đủ hàng",
  "no-sales": "Không bán",
  stopped: "Ngừng bán?",
};

/**
 * Tồn <= 0 luôn "Hết hàng" (đỏ đậm). Mã không bán trong kỳ: còn tồn là "Không
 * bán" (tồn chậm), hết tồn là "Ngừng bán?" — cả hai không có đề nghị nhập.
 */
export function stockStatus(row: AnalysisRow, settings: AnalysisSettings): StockStatus {
  if (row.avgDailySales === null) return row.stock > 0 ? "no-sales" : "stopped";
  if (row.stock <= 0) return "out";
  const cover = row.daysOfCover ?? 0;
  if (cover <= settings.redDays) return "urgent";
  if (cover <= settings.yellowDays) return "soon";
  return "ok";
}

export type CoverBucket = "no-data" | "out" | "le-x" | "x-30" | "31-90" | "91-364" | "ge-365";

export const COVER_BUCKETS: CoverBucket[] = ["no-data", "out", "le-x", "x-30", "31-90", "91-364", "ge-365"];

/** Ngưỡng vàng >= 30 thì khoảng "X+1–30 ngày" rỗng — bỏ khỏi biểu đồ và tab. */
export function visibleCoverBuckets(settings: AnalysisSettings): CoverBucket[] {
  return COVER_BUCKETS.filter((b) => b !== "x-30" || settings.yellowDays < 30);
}

export function coverBucketLabel(bucket: CoverBucket, settings: AnalysisSettings): string {
  const x = settings.yellowDays;
  switch (bucket) {
    case "no-data":
      return "Còn tồn, không bán";
    case "out":
      return "Đã hết";
    case "le-x":
      return `1–${x} ngày`;
    case "x-30":
      return `${x + 1}–30 ngày`;
    case "31-90":
      return "31–90 ngày";
    case "91-364":
      return "91–364 ngày";
    case "ge-365":
      return "≥ 365 ngày";
  }
}

/**
 * Nhóm cho biểu đồ "Số ngày còn hàng". X = ngưỡng vàng. Mã không tồn và không
 * bán ("Ngừng bán?") trả null — không có gì để phân tích, đưa vào chỉ làm cột
 * "Chưa đủ dữ liệu" che hết các cột khác.
 */
export function coverBucket(row: AnalysisRow, settings: AnalysisSettings): CoverBucket | null {
  if (row.avgDailySales === null || row.daysOfCover === null) return row.stock > 0 ? "no-data" : null;
  if (row.stock <= 0 || row.daysOfCover <= 0) return "out";
  const days = row.daysOfCover;
  if (days <= settings.yellowDays) return "le-x";
  if (days <= 30) return "x-30";
  if (days <= 90) return "31-90";
  if (days < 365) return "91-364";
  return "ge-365";
}

const isSelling = (row: AnalysisRow) => row.avgDailySales !== null;

export type Kpis = {
  /** Còn hàng, bán, còn <= X ngày (X = ngưỡng vàng) / tổng số mã. */
  needSoon: { count: number; total: number };
  /** Tồn <= 0 mà trong kỳ vẫn bán / tổng số mã tồn <= 0. */
  outWithDemand: { count: number; outTotal: number };
  /** Σ tồn của mã còn hàng — cộng dồn mọi ĐVT, chỉ để so sánh tương đối. */
  totalStock: { quantity: number; productsInStock: number };
  /** Tồn của mã không bán trong kỳ / tổng tồn. */
  noSalesStock: { quantity: number; products: number; share: number };
};

export function kpisOf(rows: AnalysisRow[], settings: AnalysisSettings): Kpis {
  const inStock = rows.filter((r) => r.stock > 0);
  const out = rows.filter((r) => r.stock <= 0);
  const noSales = inStock.filter((r) => !isSelling(r));
  const total = inStock.reduce((sum, r) => sum + r.stock, 0);
  const noSalesQty = noSales.reduce((sum, r) => sum + r.stock, 0);
  return {
    needSoon: {
      count: rows.filter((r) => stockStatus(r, settings) === "urgent" || stockStatus(r, settings) === "soon").length,
      total: rows.length,
    },
    outWithDemand: { count: out.filter((r) => r.soldInPeriod > 0).length, outTotal: out.length },
    totalStock: { quantity: total, productsInStock: inStock.length },
    noSalesStock: { quantity: noSalesQty, products: noSales.length, share: total > 0 ? noSalesQty / total : 0 },
  };
}

const byCover = (a: AnalysisRow, b: AnalysisRow) =>
  (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0) || a.code.localeCompare(b.code);
const bySoldDesc = (a: AnalysisRow, b: AnalysisRow) =>
  b.soldInPeriod - a.soldInPeriod || a.code.localeCompare(b.code);
const byStockDesc = (a: AnalysisRow, b: AnalysisRow) => b.stock - a.stock || a.code.localeCompare(b.code);

/** Ba tab bảng "Cần nhập hàng". */
export function reorderTabs(rows: AnalysisRow[], settings: AnalysisSettings) {
  const status = (r: AnalysisRow) => stockStatus(r, settings);
  return {
    soon: rows.filter((r) => status(r) === "urgent" || status(r) === "soon").sort(byCover),
    outWithDemand: rows.filter((r) => r.stock <= 0 && r.soldInPeriod > 0).sort(bySoldDesc),
    later: rows
      .filter((r) => status(r) === "ok" && (r.daysOfCover ?? 0) <= 30)
      .sort(byCover),
  };
}

export function topSellers(rows: AnalysisRow[], limit: number): AnalysisRow[] {
  return rows.filter((r) => r.soldInPeriod > 0).sort(bySoldDesc).slice(0, limit);
}

export type GroupSummary = {
  categoryId: string | null;
  categoryName: string;
  sold: number;
  stock: number;
  /** Σ tồn ÷ (Σ bán ÷ số ngày); null khi nhóm không bán. */
  daysOfCover: number | null;
};

export function topGroups(rows: AnalysisRow[], limit: number): GroupSummary[] {
  const groups = new Map<string, GroupSummary>();
  for (const r of rows) {
    const key = r.categoryId ?? "";
    const g = groups.get(key) ?? {
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? "(không nhóm)",
      sold: 0,
      stock: 0,
      daysOfCover: null,
    };
    g.sold += r.soldInPeriod;
    g.stock += r.stock;
    groups.set(key, g);
  }
  const days = rows[0]?.effectiveDays ?? 0;
  return [...groups.values()]
    .filter((g) => g.sold > 0)
    .map((g) => ({ ...g, daysOfCover: days > 0 ? g.stock / (g.sold / days) : null }))
    .sort((a, b) => b.sold - a.sold || a.categoryName.localeCompare(b.categoryName))
    .slice(0, limit);
}

/** Tồn chậm: "Không bán" (top 30 theo tồn) và "Đủ bán ≥ 365 ngày" (top 20). */
export function slowMoving(rows: AnalysisRow[]) {
  return {
    noSales: rows.filter((r) => r.stock > 0 && !isSelling(r)).sort(byStockDesc).slice(0, 30),
    overstock: rows.filter((r) => isSelling(r) && (r.daysOfCover ?? 0) >= 365).sort(byStockDesc).slice(0, 20),
  };
}

export type FinishSummary = { finish: FinishType; label: string; products: number; stock: number; sold: number };

export function finishSummary(rows: AnalysisRow[]): FinishSummary[] {
  const map = new Map<FinishType, FinishSummary>();
  for (const r of rows) {
    const s = map.get(r.finish) ?? { finish: r.finish, label: FINISH_LABELS[r.finish], products: 0, stock: 0, sold: 0 };
    s.products += 1;
    s.stock += r.stock;
    s.sold += r.soldInPeriod;
    map.set(r.finish, s);
  }
  return [...map.values()].sort((a, b) => b.sold - a.sold || a.label.localeCompare(b.label));
}

/** CSV "đề nghị nhập": mã có đề nghị > 0, ít ngày còn hàng nhất lên đầu. Không có giá. */
export function buildReorderCsv(rows: AnalysisRow[], settings: AnalysisSettings): Blob {
  const picked = rows
    .map((r) => ({ r, qty: suggestedOrder(r, settings.coverDays) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => byCover(a.r, b.r));
  const fmt = (n: number | null, digits: number) => (n === null ? "" : Number(n.toFixed(digits)));
  return buildCsv(
    ["Mã hàng", "Tên hàng", "Nhóm hàng", "Loại hoàn thiện", "Tồn", "Đơn đặt", "Khả dụng", "Bán TB/ngày", "Còn (ngày)", "Đề nghị nhập"],
    picked.map(({ r, qty }) => [
      r.code,
      r.name,
      r.categoryName ?? "",
      FINISH_LABELS[r.finish],
      r.stock,
      r.customerOrdered,
      r.available,
      fmt(r.avgDailySales, 2),
      fmt(r.daysOfCover, 1),
      qty,
    ]),
  );
}
