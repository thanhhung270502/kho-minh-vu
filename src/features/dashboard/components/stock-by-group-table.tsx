"use client";

import { Table, theme } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type { StockStatus } from "@/features/products/schemas/filter.schema";

import { buildCatalogDrilldownUrl, type StockGroupBy } from "../lib/stock-drilldown";
import type { StockByGroupRow } from "../types";

type Props = {
  rows: StockByGroupRow[];
  groupBy: StockGroupBy;
};

type CountKey = "total" | "inStock" | "outOfStock" | "negative" | "belowMinimum";

// stockStatus: null = "Tổng mã" (không lọc trạng thái tồn) — hợp đồng của
// buildCatalogDrilldownUrl/StockStatus (database), không phải tên cột tiếng Việt.
const COUNT_COLUMNS: Array<{
  key: CountKey;
  title: string;
  stockStatus: StockStatus | null;
}> = [
  { key: "total", title: "Tổng mã", stockStatus: null },
  { key: "inStock", title: "Còn hàng", stockStatus: "con_hang" },
  { key: "outOfStock", title: "Hết hàng", stockStatus: "het_hang" },
  { key: "negative", title: "Âm", stockStatus: "am" },
  { key: "belowMinimum", title: "Dưới định mức", stockStatus: "duoi_dinh_muc" },
];

function sumBy(rows: readonly StockByGroupRow[], key: CountKey): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

/**
 * Bảng số mã theo nhóm/công đoạn — mỗi ô số khác 0 (trừ dòng "Chưa phân
 * nhóm") là link mở Danh sách hàng hóa lọc sẵn đúng nhóm + trạng thái (D-08).
 */
export function StockByGroupTable({ rows, groupBy }: Props) {
  const { token } = theme.useToken();

  const groupTitle = groupBy === "category" ? "Nhóm hàng" : "Công đoạn";
  const unassignedLabel =
    groupBy === "category" ? "Chưa phân nhóm" : "Chưa gán công đoạn";

  const columns: TableColumnsType<StockByGroupRow> = [
    {
      title: groupTitle,
      dataIndex: "groupName",
      key: "groupName",
      sorter: (a, b) =>
        (a.groupName ?? unassignedLabel).localeCompare(b.groupName ?? unassignedLabel, "vi"),
      render: (_: string | null, row) => row.groupName ?? unassignedLabel,
    },
    ...COUNT_COLUMNS.map(({ key, title, stockStatus }) => ({
      title,
      dataIndex: key,
      key,
      align: "right" as const,
      className: "tabular-nums",
      sorter: (a: StockByGroupRow, b: StockByGroupRow) => a[key] - b[key],
      render: (value: number, row: StockByGroupRow) => {
        const color =
          key === "negative" && value > 0
            ? token.colorError
            : key === "belowMinimum" && value > 0
              ? token.colorWarning
              : undefined;
        const text = <span style={{ color }}>{value.toLocaleString("vi-VN")}</span>;

        if (row.groupId === null || value === 0) return text;

        return (
          <Link
            href={buildCatalogDrilldownUrl({
              groupBy,
              groupId: row.groupId,
              stockStatus,
            })}
            title="Mở danh sách hàng hóa đã lọc"
            style={{ color }}
          >
            {value.toLocaleString("vi-VN")}
          </Link>
        );
      },
    })),
  ];

  return (
    <div className="overflow-x-auto">
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        scroll={{ x: "max-content", y: 480 }}
        columns={columns}
        dataSource={rows}
        summary={(pageData) => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <strong>Tổng</strong>
            </Table.Summary.Cell>
            {COUNT_COLUMNS.map(({ key }, index) => (
              <Table.Summary.Cell key={key} index={index + 1} align="right">
                <strong>{sumBy(pageData, key).toLocaleString("vi-VN")}</strong>
              </Table.Summary.Cell>
            ))}
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
