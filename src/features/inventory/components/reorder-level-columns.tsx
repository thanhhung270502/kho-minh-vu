"use client";

import { Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";

import {
  SUGGESTION_BASIS_LABELS,
  type ReorderSuggestion,
  type SuggestionBasis,
} from "../types";

/** Màu theo độ tin cậy: lịch sử của chính mã > mượn trung bình nhóm > không có gì. */
const BASIS_COLORS: Record<SuggestionBasis, string> = {
  theo_ma: "green",
  trung_binh_nhom: "gold",
  khong_du_lieu: "default",
};

function formatQuantity(value: number): string {
  return value.toLocaleString("vi-VN");
}

/** Căn cứ ghi bằng số — người duyệt thấy con số nào đáng tin trước khi bấm. */
function basisDetail(row: ReorderSuggestion): string {
  switch (row.basis) {
    case "theo_ma":
      return `${row.dataDays} ngày · ${row.saleCount} lần bán · đã bán ${formatQuantity(row.totalSold)}`;
    case "trung_binh_nhom":
      return `trung bình của ${row.peersWithHistory} mã cùng nhóm`;
    case "khong_du_lieu":
      return "nhóm chưa có mã nào từng bán";
  }
}

export const REORDER_LEVEL_COLUMNS: TableColumnsType<ReorderSuggestion> = [
  { title: "Mã hàng", dataIndex: "code", width: 160, fixed: "left" },
  { title: "Tên hàng", dataIndex: "name", width: 300, ellipsis: true },
  {
    title: "Nhóm",
    dataIndex: "categoryName",
    width: 180,
    ellipsis: true,
    render: (name: string | null) => name ?? "—",
  },
  {
    title: "Định mức hiện tại",
    dataIndex: "currentLevel",
    width: 130,
    align: "right",
    // 0 nghĩa là chưa đặt — cùng cách hiện với cột Định mức của màn tồn kho.
    render: (level: number) =>
      level === 0 ? (
        <span className="text-gray-400">—</span>
      ) : (
        formatQuantity(level)
      ),
  },
  {
    title: "Đề xuất",
    dataIndex: "suggestedLevel",
    width: 100,
    align: "right",
    render: (level: number) => (
      <span className="font-semibold">{formatQuantity(level)}</span>
    ),
  },
  {
    title: "Căn cứ",
    key: "basis",
    width: 280,
    render: (_, row) => (
      <div className="flex flex-col items-start gap-1">
        <Tag color={BASIS_COLORS[row.basis]}>
          {SUGGESTION_BASIS_LABELS[row.basis]}
        </Tag>
        <Typography.Text type="secondary" className="text-xs">
          {basisDetail(row)}
        </Typography.Text>
      </div>
    ),
  },
];

export const REORDER_LEVEL_TABLE_WIDTH = REORDER_LEVEL_COLUMNS.reduce(
  (sum, column) => sum + (typeof column.width === "number" ? column.width : 0),
  0,
);
