"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { RECEIPT_PAGE_SIZE, type ReceiptFilter } from "../schemas/receipt.schema";
import {
  DOC_STATUS_COLORS,
  DOC_STATUS_LABELS,
  RECEIPT_SOURCE_COLORS,
  RECEIPT_SOURCE_LABELS,
  type DocumentRow,
} from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "—" : Number(value).toLocaleString("vi-VN");
}

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
  {
    title: "Nguồn",
    dataIndex: "source",
    width: 110,
    render: (source: DocumentRow["source"]) =>
      source ? (
        <Tag color={RECEIPT_SOURCE_COLORS[source]}>
          {RECEIPT_SOURCE_LABELS[source]}
        </Tag>
      ) : null,
  },
  { title: "Nhà cung cấp", dataIndex: "partnerName", width: 240, ellipsis: true },
  { title: "Kho", dataIndex: "warehouseName", width: 110 },
  {
    title: "Số dòng",
    dataIndex: "lineCount",
    width: 90,
    align: "right",
    render: formatNumber,
  },
  {
    title: "Tổng số lượng",
    dataIndex: "totalQuantity",
    width: 130,
    align: "right",
    render: formatNumber,
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    render: (status: DocumentRow["status"]) => (
      <Tag color={DOC_STATUS_COLORS[status]}>{DOC_STATUS_LABELS[status]}</Tag>
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
};

export function ReceiptTableBody({
  rows,
  total,
  filter,
  loading,
  onFilterChange,
}: Props) {
  return (
    <Table<DocumentRow>
      rowKey="id"
      size="small"
      sticky
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1000 }}
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
