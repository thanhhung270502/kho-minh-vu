"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";
import { partnerLabel } from "@/shared/lib/recipient";

import { ORDER_STATUS_TONES, ORDER_STATUS_LABELS } from "../lib/order-status";
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
      <Link href={`/don-dat/${row.id}`} className="font-mono">
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
  {
    title: "Người nhận",
    dataIndex: "recipients",
    width: 260,
    render: (recipients: OrderRow["recipients"]) => (
      <span className="flex flex-wrap items-center gap-1">
        {recipients.partner ? (
          <span>{partnerLabel(recipients.partner)}</span>
        ) : (
          <Tag>Nội bộ</Tag>
        )}
        {recipients.staff.map((person) => (
          <Tag key={person.id} className="m-0">
            {person.name}
          </Tag>
        ))}
      </span>
    ),
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
      <StatusDot tone={ORDER_STATUS_TONES[status]} strike={status === "DA_HUY"}>{ORDER_STATUS_LABELS[status]}</StatusDot>
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
      scroll={{ x: 1060 }}
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
