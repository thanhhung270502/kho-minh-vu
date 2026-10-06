"use client";

import { Table, theme } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type { StockStatus } from "@/features/products/schemas/filter.schema";

import {
  buildCatalogDrilldownUrl,
  type StockGroupBy,
} from "../lib/stock-drilldown";
import { groupShare } from "../lib/overview-format";
import type { StockByGroupRow } from "../types";

type Props = {
  rows: StockByGroupRow[];
  groupBy: StockGroupBy;
};

type CountKey = "total" | "inStock" | "outOfStock" | "negative";

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

  const groupTitle = groupBy === "category" ? "Nhóm hàng" : "Xử lý";
  const unassignedLabel =
    groupBy === "category" ? "Chưa phân nhóm" : "Chưa gán xử lý";

  const share = groupShare(rows);
  const percentOf = (row: StockByGroupRow) => share.get(row.key) ?? 0;

  const columns: TableColumnsType<StockByGroupRow> = [
    {
      title: groupTitle,
      dataIndex: "groupName",
      key: "groupName",
      width: 170,
      ellipsis: true,
      sorter: (a, b) =>
        (a.groupName ?? unassignedLabel).localeCompare(
          b.groupName ?? unassignedLabel,
          "vi",
        ),
      render: (_: string | null, row) => row.groupName ?? unassignedLabel,
    },
    {
      title: "Tỷ trọng",
      key: "share",
      width: 120,
      render: (_: unknown, row) => (
        <div className="h-1.5 w-full rounded-full bg-trung-tinh-75">
          <div
            className="h-1.5 rounded-full bg-chu-chinh"
            style={{ width: `${Math.min(100, Math.max(0, percentOf(row)))}%` }}
          />
        </div>
      ),
    },
    {
      title: "SL tồn",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right",
      className: "tabular-nums",
      sorter: (a, b) => a.totalQuantity - b.totalQuantity,
      render: (value: number) => value.toLocaleString("vi-VN"),
    },
    {
      title: "%",
      key: "percent",
      align: "right",
      className: "tabular-nums text-trung-tinh-350",
      sorter: (a, b) => percentOf(a) - percentOf(b),
      render: (_: unknown, row) => `${percentOf(row).toLocaleString("vi-VN")}%`,
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
          key === "negative" && value > 0 ? token.colorError : undefined;
        const text = (
          <span style={{ color }}>{value.toLocaleString("vi-VN")}</span>
        );

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
    // Một thanh cuộn dọc duy nhất (của bảng); bảng vừa bề ngang thẻ, không cuộn ngang.
    <Table
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ y: 480 }}
      columns={columns}
      dataSource={rows}
      summary={(pageData) => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>
            <strong>Tổng</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1} />
          <Table.Summary.Cell index={2} align="right">
            <strong>
              {pageData
                .reduce((total, row) => total + row.totalQuantity, 0)
                .toLocaleString("vi-VN")}
            </strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={3} />
          {COUNT_COLUMNS.map(({ key }, index) => (
            <Table.Summary.Cell key={key} index={index + 4} align="right">
              <strong>{sumBy(pageData, key).toLocaleString("vi-VN")}</strong>
            </Table.Summary.Cell>
          ))}
        </Table.Summary.Row>
      )}
    />
  );
}
