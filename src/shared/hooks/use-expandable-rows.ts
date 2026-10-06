"use client";

import type { TableProps } from "antd";
import { useState, type ReactNode } from "react";

import { isInteractiveTarget } from "@/shared/lib/selected-id";

/**
 * Bấm một dòng của bảng danh sách = mở / gập phần xem nhanh ngay dưới dòng, mỗi lúc
 * một dòng. Bấm vào link, nút, ô nhập trong dòng thì không mở. Dùng chung cho Đơn đặt,
 * Duyệt đơn, Phiếu nhập.
 */
export function useExpandableRows<T extends { id: string }>(
  render: (row: T) => ReactNode,
): Pick<TableProps<T>, "expandable" | "rowClassName" | "onRow"> {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return {
    expandable: {
      expandedRowKeys: expandedId ? [expandedId] : [],
      expandedRowRender: render,
      showExpandColumn: false,
      expandedRowClassName: () => "[&>td]:bg-brand-25",
    },
    rowClassName: (row) => (row.id === expandedId ? "cursor-pointer [&>td]:bg-brand-50" : "cursor-pointer"),
    onRow: (row) => ({
      onClick: (event) => {
        if (isInteractiveTarget(event.target as Element)) return;
        setExpandedId((current) => (current === row.id ? null : row.id));
      },
    }),
  };
}
