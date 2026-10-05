"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";
import { partnerLabel, showsStaffOnly } from "@/shared/lib/recipient";

import { ORDER_STATUS_TONES, ORDER_STATUS_LABELS } from "../lib/order-status";
import { OrderProgressBar } from "./order-progress-bar";
import { ORDER_PAGE_SIZE, type OrderFilter } from "../schemas/order.schema";
import type { OrderRow } from "../types";
import { useStickyTableOffset } from "@/shared/hooks/use-sticky-table-offset";

const COLUMNS: TableColumnsType<OrderRow> = [
  {
    title: "Số đơn",
    dataIndex: "orderNo",
    width: 128,
    fixed: "left",
    render: (orderNo: string, row) => (
      <Link href={`/don-dat/${row.id}`} className="font-mono text-[12.5px] font-medium">
        {orderNo}
      </Link>
    ),
  },
  {
    title: "Ngày đơn",
    dataIndex: "orderDate",
    width: 96,
    render: (date: string) => (
      <span className="text-trung-tinh-500 tabular-nums">{dayjs(date).format("DD/MM/YYYY")}</span>
    ),
  },
  {
    title: "Người nhận",
    dataIndex: "recipients",
    width: 260,
    render: (recipients: OrderRow["recipients"]) => {
      const [first, ...rest] = recipients.staff;
      // Đơn tạm được tạo trống người nhận (0097) — không phải đơn "Nội bộ".
      if (!recipients.partner && !first) {
        return <span className="text-chu-phu">Chưa chọn người nhận</span>;
      }
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          {showsStaffOnly(recipients) ? (
            <>
              <span className="font-bold">{first?.name}</span>
              {rest.length > 0 ? <span className="text-chu-phu">+{rest.length}</span> : null}
            </>
          ) : recipients.partner ? (
            <>
              <span className="font-bold">{partnerLabel(recipients.partner)}</span>
              {recipients.staff.map((person) => (
                <Tag key={person.id} className="m-0">
                  {person.name}
                </Tag>
              ))}
            </>
          ) : (
            <>
              {first ? <span className="font-bold">{first.name}</span> : null}
              {rest.length > 0 ? <span className="text-chu-phu">+{rest.length}</span> : null}
              <span className="shrink-0 rounded-md border border-vien px-[7px] text-[11px] font-bold">
                Nội bộ
              </span>
            </>
          )}
        </span>
      );
    },
  },
  {
    title: "Tiến độ",
    key: "progress",
    width: 150,
    // D-04: trục giao tính khi đọc, không phải enum.
    render: (_, row) => (
      <OrderProgressBar shipped={row.shippedQuantity} ordered={row.orderedQuantity} />
    ),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 128,
    render: (status: OrderRow["status"]) => (
      <StatusDot
        variant="badge"
        tone={ORDER_STATUS_TONES[status]}
        className={status === "DA_HUY" ? "line-through" : undefined}
      >
        {ORDER_STATUS_LABELS[status]}
      </StatusDot>
    ),
  },
  {
    title: "Người tạo",
    dataIndex: "createdByName",
    width: 110,
    ellipsis: true,
    render: (name: string | null) => <span className="text-chu-phu">{name}</span>,
  },
  {
    title: "",
    key: "open",
    width: 28,
    render: (_, row) => (
      <Link href={`/don-dat/${row.id}`} aria-label="Mở đơn" className="text-trung-tinh-250">
        ›
      </Link>
    ),
  },
];

type Props = {
  rows: OrderRow[];
  total: number;
  filter: OrderFilter;
  loading: boolean;
  onFilterChange: (filter: OrderFilter) => void;
};

export function OrderTableBody({ rows, total, filter, loading, onFilterChange }: Props) {
  const offsetHeader = useStickyTableOffset();
  return (
    <Table<OrderRow>
      rowKey="id"
      size="small"
      sticky={{ offsetHeader }}
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      scroll={{ x: 980 }}
      pagination={{
        current: filter.page,
        pageSize: ORDER_PAGE_SIZE,
        total,
        showSizeChanger: false,
        onChange: (page) => onFilterChange({ ...filter, page }),
      }}
    />
  );
}
