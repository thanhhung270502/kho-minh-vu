// File thuần (bẫy 9): component và scripts/test-pure-functions.ts cùng import.
// RPC phan_tich_ton_kho trả số theo từng mã (pgTAP 98 kiểm); mọi phép gom,
// xếp hạng, tô màu của trang Phân tích nằm ở đây.
import { buildCsv } from "@/shared/lib/csv";

import { finishFromStageCode, type AnalysisRow, type AnalysisSettings } from "../types";

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

const byCover = (a: AnalysisRow, b: AnalysisRow) =>
  (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0) || a.code.localeCompare(b.code);
const bySoldDesc = (a: AnalysisRow, b: AnalysisRow) =>
  b.soldInPeriod - a.soldInPeriod || a.code.localeCompare(b.code);

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

/** Excel "danh sách cần nhập": chỉ mã, tên, số lượng cần nhập — mã có đề nghị > 0, nhiều nhất lên đầu. */
export function buildReorderCsv(rows: AnalysisRow[], settings: AnalysisSettings): Blob {
  const list = rows
    .map((r) => ({ r, qty: suggestedOrder(r, settings.coverDays) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty || a.r.code.localeCompare(b.r.code));
  return buildCsv(["Mã hàng", "Tên hàng", "Số lượng cần nhập"], list.map(({ r, qty }) => [r.code, r.name, qty]));
}
