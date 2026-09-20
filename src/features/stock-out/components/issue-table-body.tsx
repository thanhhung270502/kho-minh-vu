"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { DOC_STATUS_COLORS, DOC_STATUS_LABELS, type IssueRow } from "../types";
import { ISSUE_PAGE_SIZE, type IssueFilter } from "../schemas/issue.schema";

function formatNumber(value: number | string | null): string {
  return value === null ? "—" : Number(value).toLocaleString("vi-VN");
}

const COLUMNS: TableColumnsType<IssueRow> = [
  {
    title: "Số phiếu",
    dataIndex: "docNo",
    width: 150,
    fixed: "left",
    render: (docNo: string, row) => (
      <Link href={`/xuat-kho/${row.id}`} className="font-mono">
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
  { title: "Người nhận", dataIndex: "partnerName", width: 200, ellipsis: true },
  {
    title: "Đơn gốc",
    dataIndex: "orderNo",
    width: 130,
    render: (orderNo: IssueRow["orderNo"], row) =>
      orderNo && row.orderId ? (
        <Link href={`/dat-hang/${row.orderId}`} className="font-mono">
          {orderNo}
        </Link>
      ) : (
        "—"
      ),
  },
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
    render: (status: IssueRow["status"]) => (
      <Tag color={DOC_STATUS_COLORS[status]}>{DOC_STATUS_LABELS[status]}</Tag>
    ),
  },
  { title: "Người tạo", dataIndex: "createdByName", width: 160, ellipsis: true },
];

type Props = {
  rows: IssueRow[];
  total: number;
  filter: IssueFilter;
  loading: boolean;
  onFilterChange: (filter: IssueFilter) => void;
};

export function IssueTableBody({
  rows,
  total,
  filter,
  loading,
  onFilterChange,
}: Props) {
  return (
    <Table<IssueRow>
      rowKey="id"
      size="small"
      sticky
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1050 }}
      pagination={{
        current: filter.page,
        pageSize: ISSUE_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count.toLocaleString("vi-VN")} phiếu`,
        onChange: (page) => onFilterChange({ ...filter, page }),
      }}
    />
  );
}
