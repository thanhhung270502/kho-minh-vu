"use client";

import { Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type {
  InventoryFilter,
  InventorySortField,
} from "../schemas/inventory.schema";
import type { InventoryRow } from "../types";

export type WarehouseColumn = { id: string; name: string };

type Params = {
  filter: InventoryFilter;
  /** Kho nào có cột — dựng động từ danh mục kho, thêm kho thứ ba không phải sửa file này. */
  warehouses: WarehouseColumn[];
};

function sortOrderFor(filter: InventoryFilter, field: InventorySortField) {
  if (filter.sortBy !== field) return null;
  return filter.sortDir === "desc" ? ("descend" as const) : ("ascend" as const);
}

/** Âm đỏ, bằng 0 xám nhạt — lướt dọc cột là thấy ngay chỗ bất thường. */
function Quantity({ value, strong }: { value: number; strong?: boolean }) {
  const tone = value < 0 ? "text-red-600" : value === 0 ? "text-gray-400" : "";
  return (
    <span className={`${tone} ${strong ? "font-semibold" : ""}`}>
      {value.toLocaleString("vi-VN")}
    </span>
  );
}

/** Mã chưa đặt định mức (0) không bao giờ bị gắn cờ, dù tồn bằng 0. */
function isBelowMinimum(row: InventoryRow): boolean {
  return row.minStock > 0 && row.totalStock < row.minStock;
}

// D-02: màn tồn chỉ có số lượng — không cột nào nhân với giá.
export function buildStockColumns({
  filter,
  warehouses,
}: Params): TableColumnsType<InventoryRow> {
  return [
    {
      title: "Mã hàng",
      dataIndex: "code",
      key: "code",
      width: 150,
      fixed: "left",
      sorter: true,
      sortOrder: sortOrderFor(filter, "code"),
      // Trang chi tiết mã có tab Thẻ kho — đường truy từ số tồn về chứng từ (TON-02).
      render: (code: string, row) => (
        <Link href={`/danh-muc/${row.id}`} className="font-mono">
          {code}
        </Link>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "name",
      key: "name",
      width: 260,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor(filter, "name"),
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    {
      title: "Nhóm",
      dataIndex: "categoryName",
      width: 150,
      ellipsis: true,
      render: (name: string | null) =>
        name ?? <span className="text-gray-400">(không nhóm)</span>,
    },
    {
      title: "Công đoạn",
      dataIndex: "stageName",
      width: 120,
      render: (name: string | null, row) =>
        name ? <Tag color={row.stageColor ?? undefined}>{name}</Tag> : "—",
    },
    {
      title: "ĐVT",
      dataIndex: "unitName",
      width: 70,
      render: (name: string | null) => name ?? "—",
    },
    ...warehouses.map((warehouse) => ({
      title: warehouse.name,
      key: `warehouse-${warehouse.id}`,
      width: 110,
      align: "right" as const,
      className: "tabular-nums",
      render: (_: unknown, row: InventoryRow) => (
        // Kho chưa từng có dòng tồn của mã thì không có khóa trong map.
        <Quantity value={row.stockByWarehouse[warehouse.id] ?? 0} />
      ),
    })),
    {
      title: "Tổng",
      dataIndex: "totalStock",
      key: "totalStock",
      width: 170,
      align: "right",
      className: "tabular-nums",
      sorter: true,
      sortOrder: sortOrderFor(filter, "totalStock"),
      render: (total: number, row) => (
        <span className="inline-flex items-center gap-2">
          {isBelowMinimum(row) ? (
            <Tag color="orange" className="me-0">
              Dưới định mức
            </Tag>
          ) : null}
          <Quantity value={total} strong />
        </span>
      ),
    },
    {
      title: "Định mức",
      dataIndex: "minStock",
      width: 100,
      align: "right",
      className: "tabular-nums",
      render: (minStock: number) =>
        minStock > 0 ? (
          minStock.toLocaleString("vi-VN")
        ) : (
          <Tooltip title="Chưa đặt định mức tồn tối thiểu">
            <span className="text-gray-400">—</span>
          </Tooltip>
        ),
    },
  ];
}
