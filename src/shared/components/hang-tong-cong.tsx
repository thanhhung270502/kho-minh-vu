"use client";

import { Table, Tooltip } from "antd";
import type { Key, ReactNode } from "react";

type Props = {
  /** Đúng mảng đang truyền vào prop `columns` của Table. */
  cot: ReadonlyArray<{ key?: Key; dataIndex?: unknown }>;
  /** Table có bật rowSelection không — nếu có thì cột 0 là ô chọn. */
  coChon: boolean;
  /** Nội dung ô đầu tiên, vd "Tổng cộng — 3.266 mã". */
  nhan: ReactNode;
  /** dataIndex -> tổng của các dòng ĐANG HIỂN THỊ. */
  cong?: Record<string, number>;
};

/**
 * Hàng tổng cộng dựng từ CHÍNH mảng cột truyền cho Table để chỉ số ô không
 * bao giờ lệch khi cột bật/tắt theo quyền (Giá vốn, Sửa) hoặc rowSelection.
 */
export function HangTongCong({ cot, coChon, nhan, cong = {} }: Props) {
  return (
    <Table.Summary fixed="top">
      <Table.Summary.Row className="bg-nen-tong font-semibold">
        {coChon ? <Table.Summary.Cell index={0} key="chon" /> : null}

        {cot.map((c, i) => {
          const index = coChon ? i + 1 : i;
          const key = String(c.key ?? i);
          const dataIndex = typeof c.dataIndex === "string" ? c.dataIndex : undefined;

          if (i === 0) {
            return (
              <Table.Summary.Cell key={key} index={index}>
                {nhan}
              </Table.Summary.Cell>
            );
          }

          if (dataIndex && dataIndex in cong) {
            const tongCot = cong[dataIndex] ?? 0;
            return (
              <Table.Summary.Cell key={key} index={index}>
                <Tooltip title="Cộng các dòng đang hiển thị trên trang này">
                  <span className="block text-right tabular-nums">
                    {tongCot.toLocaleString("vi-VN")}
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
