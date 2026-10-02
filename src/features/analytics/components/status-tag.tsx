"use client";

import { Tag } from "antd";

import { STOCK_STATUS_LABELS, stockStatus, type StockStatus } from "../lib/analysis";
import type { AnalysisRow, AnalysisSettings } from "../types";

const COLORS: Record<StockStatus, string> = {
  out: "#a8071a",
  urgent: "red",
  soon: "gold",
  ok: "green",
  "no-sales": "default",
  stopped: "default",
};

export function StatusTag({ row, settings }: { row: AnalysisRow; settings: AnalysisSettings }) {
  const status = stockStatus(row, settings);
  return (
    <Tag className="m-0" color={COLORS[status]}>
      {STOCK_STATUS_LABELS[status]}
    </Tag>
  );
}

export const formatQty = (n: number | null, digits = 0) =>
  n === null ? "—" : n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
