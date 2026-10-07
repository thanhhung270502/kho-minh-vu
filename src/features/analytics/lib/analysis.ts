// File thuần (bẫy 9): component và scripts/test-pure-functions.ts cùng import.
// RPC phan_tich_ton_kho trả số theo từng mã (pgTAP 98 kiểm); mọi phép gom,
// xếp hạng, tô màu của trang Phân tích nằm ở đây.
import { buildCsv } from "@/shared/lib/csv";

import { finishFromStageCode, type AnalysisRow, type AnalysisSettings } from "../types";

export const finishOf = finishFromStageCode;

/**
 * Đề nghị nhập = đủ xuất Y ngày (⌈ADU × Y − khả dụng⌉) nhưng KHÔNG ÍT HƠN phần
 * thiếu so với định mức (định mức − khả dụng). Âm thì 0. Mã không xuất trong kỳ
 * chỉ đề nghị bù định mức.
 */
export function suggestedOrder(row: AnalysisRow, coverDays: number): number {
  const toMinimum = row.minStock - row.available;
  const toCover = row.avgDailySales === null ? 0 : row.avgDailySales * coverDays - row.available;
  return Math.max(0, Math.ceil(Math.max(toMinimum, toCover)));
}

export type StockStatus = "urgent" | "soon" | "ok" | "no-sales";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  urgent: "Dưới định mức",
  soon: "Sắp thiếu hàng",
  ok: "Trên định mức",
  "no-sales": "Không xuất",
};

/**
 * Theo định mức (Phân tích › Định mức):
 * - Dưới định mức (đỏ): tồn < định mức.
 * - Sắp thiếu hàng (cam): không dưới định mức nhưng theo tốc độ xuất / đơn đặt sẽ thiếu
 *   trong Y ngày dự trữ (đề nghị nhập > 0) — gồm cả mã đã hết mà chưa đặt định mức.
 * - Trên định mức (xanh): không dưới định mức và đủ xuất Y ngày.
 * - Không xuất: không xuất, không đơn đặt trong kỳ và không dưới định mức.
 */
export function stockStatus(row: AnalysisRow, settings: AnalysisSettings): StockStatus {
  if (row.stock < row.minStock) return "urgent";
  const hasDemand = row.avgDailySales !== null || row.customerOrdered > 0;
  if (!hasDemand) return "no-sales";
  return suggestedOrder(row, settings.coverDays) > 0 ? "soon" : "ok";
}

const byCover = (a: AnalysisRow, b: AnalysisRow) =>
  (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0) || a.code.localeCompare(b.code);
const bySoldDesc = (a: AnalysisRow, b: AnalysisRow) =>
  b.soldInPeriod - a.soldInPeriod || a.code.localeCompare(b.code);

/** Ba tab bảng "Cần nhập hàng" — theo trạng thái định mức. */
export function reorderTabs(rows: AnalysisRow[], settings: AnalysisSettings) {
  const status = (r: AnalysisRow) => stockStatus(r, settings);
  return {
    urgent: rows.filter((r) => status(r) === "urgent").sort(byCover),
    soon: rows.filter((r) => status(r) === "soon").sort(byCover),
    outWithDemand: rows.filter((r) => r.stock <= 0 && r.soldInPeriod > 0).sort(bySoldDesc),
  };
}

/** Excel "danh sách cần nhập": chỉ mã, tên, số lượng cần nhập — mã có đề nghị > 0, nhiều nhất lên đầu. */
export function buildReorderCsv(rows: AnalysisRow[], settings: AnalysisSettings): Blob {
  const list = rows
    .map((r) => ({ r, qty: suggestedOrder(r, settings.coverDays) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty || a.r.code.localeCompare(b.r.code));
  return buildCsv(["Mã hàng", "Tên hàng", "Số lượng cần nhập"], list.map(({ r, qty }) => [r.code, r.name, qty]));
}
