"use client";

import { Table } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";

import { RECEIPT_PAGE_SIZE, type ReceiptFilter } from "../schemas/receipt.schema";
import {
  DOC_STATUS_TONES,
  DOC_STATUS_LABELS,
  type DocumentRow,
  type ReceiptPermissions,
} from "../types";
import { useStickyTableOffset } from "@/shared/hooks/use-sticky-table-offset";
import { useExpandableRows } from "@/shared/hooks/use-expandable-rows";

import { ReceiptExpanded } from "./receipt-expanded";

const COLUMNS: TableColumnsType<DocumentRow> = [
  {
    title: "Số phiếu",
    dataIndex: "docNo",
    width: 150,
    fixed: "left",
    render: (docNo: string, row) => (
      <Link href={`/nhap-kho/${row.id}`} className="font-mono">
        {docNo}
      </Link>
    ),
  },
  {
    title: "Ngày",
    dataIndex: "docDate",
    width: 110,
    render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
  },
  { title: "Nhà cung cấp", dataIndex: "partnerName", width: 240, ellipsis: true },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    render: (status: DocumentRow["status"]) => (
      <StatusDot variant="badge" tone={DOC_STATUS_TONES[status]} strike={status === "DA_HUY"}>{DOC_STATUS_LABELS[status]}</StatusDot>
    ),
  },
  { title: "Người tạo", dataIndex: "createdByName", width: 160, ellipsis: true },
];

type Props = {
  rows: DocumentRow[];
  total: number;
  filter: ReceiptFilter;
  loading: boolean;
  onFilterChange: (filter: ReceiptFilter) => void;
  permissions: ReceiptPermissions;
};

export function ReceiptTableBody({
  rows,
  total,
  filter,
  loading,
  onFilterChange,
  permissions,
}: Props) {
  const offsetHeader = useStickyTableOffset();
  const expandable = useExpandableRows<DocumentRow>((row) => (
    <ReceiptExpanded id={row.id} permissions={permissions} />
  ));
  return (
    <Table<DocumentRow>
      rowKey="id"
      size="small"
      sticky={{ offsetHeader }}
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      {...expandable}
      scroll={{ x: 670 }}
      pagination={{
        current: filter.page,
        pageSize: RECEIPT_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count.toLocaleString("vi-VN")} phiếu`,
        onChange: (page) => onFilterChange({ ...filter, page }),
      }}
    />
  );
}
