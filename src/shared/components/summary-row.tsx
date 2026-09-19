"use client";

import { Table, Tooltip } from "antd";
import type { Key, ReactNode } from "react";

type Props = {
  /** Đúng mảng đang truyền vào prop `columns` của Table. */
  columns: ReadonlyArray<{ key?: Key; dataIndex?: unknown }>;
  /** Table có bật rowSelection không — nếu có thì cột 0 là ô chọn. */
  hasSelection: boolean;
  /** Nội dung ô đầu tiên, vd "Tổng cộng — 3.266 mã". */
  label: ReactNode;
  /** dataIndex -> tổng của các dòng ĐANG HIỂN THỊ. */
  totals?: Record<string, number>;
};

/**
 * Hàng tổng cộng dựng từ CHÍNH mảng cột truyền cho Table để chỉ số ô không
 * bao giờ lệch khi cột bật/tắt theo quyền (Giá vốn, Sửa) hoặc rowSelection.
 */
export function SummaryRow({ columns, hasSelection, label, totals = {} }: Props) {
  return (
    <Table.Summary fixed="top">
      <Table.Summary.Row className="bg-nen-tong font-semibold">
        {hasSelection ? <Table.Summary.Cell index={0} key="selection" /> : null}

        {columns.map((column, position) => {
          const index = hasSelection ? position + 1 : position;
          const key = String(column.key ?? position);
          const dataIndex =
            typeof column.dataIndex === "string" ? column.dataIndex : undefined;

          if (position === 0) {
            return (
              <Table.Summary.Cell key={key} index={index}>
                {label}
              </Table.Summary.Cell>
            );
          }

          if (dataIndex && dataIndex in totals) {
            const columnTotal = totals[dataIndex] ?? 0;
            return (
              <Table.Summary.Cell key={key} index={index}>
                <Tooltip title="Cộng các dòng đang hiển thị trên trang này">
                  <span className="block text-right tabular-nums">
                    {columnTotal.toLocaleString("vi-VN")}
                  </span>
                </Tooltip>
              </Table.Summary.Cell>
            );
          }

          return <Table.Summary.Cell key={key} index={index} />;
        })}
      </Table.Summary.Row>
    </Table.Summary>
  );
}
