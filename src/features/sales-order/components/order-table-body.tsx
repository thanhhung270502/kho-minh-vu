"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/order-status";
import { ORDER_PAGE_SIZE, type OrderFilter } from "../schemas/order.schema";
import type { OrderRow } from "../types";

function formatQuantity(value: number): string {
  return value.toLocaleString("vi-VN");
}

const COLUMNS: TableColumnsType<OrderRow> = [
  {
    title: "Số đơn",
    dataIndex: "orderNo",
    width: 150,
    fixed: "left",
    render: (orderNo: string, row) => (
      <Link href={`/dat-hang/${row.id}`} className="font-mono">
        {orderNo}
      </Link>
    ),
  },
  {
    title: "Ngày đơn",
    dataIndex: "orderDate",
    width: 110,
    render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
  },
  { title: "Người nhận", dataIndex: "partnerName", width: 220, ellipsis: true },
  {
    title: "Ngày giao dự kiến",
    dataIndex: "deliveryDate",
    width: 140,
    render: (date: string | null) => (date ? dayjs(date).format("DD/MM/YYYY") : "—"),
  },
  {
    title: "Tiến độ",
    key: "progress",
    width: 100,
    align: "right",
    // D-04: trục giao tính khi đọc, không phải enum — hiện thẳng hai con số.
    render: (_, row) =>
      `${formatQuantity(row.shippedQuantity)}/${formatQuantity(row.orderedQuantity)}`,
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    render: (status: OrderRow["status"]) => (
      <Tag color={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status]}</Tag>
    ),
  },
  { title: "Người tạo", dataIndex: "createdByName", width: 160, ellipsis: true },
];

type Props = {
  rows: OrderRow[];
  total: number;
  filter: OrderFilter;
  loading: boolean;
  onFilterChange: (filter: OrderFilter) => void;
};

export function OrderTableBody({ rows, total, filter, loading, onFilterChange }: Props) {
  return (
    <Table<OrderRow>
      rowKey="id"
      size="small"
      sticky
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1000 }}
      pagination={{
        current: filter.page,
        pageSize: ORDER_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count.toLocaleString("vi-VN")} đơn`,
        onChange: (page) => onFilterChange({ ...filter, page }),
      }}
    />
  );
}
