"use client";

import { Table } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";

import { DOC_STATUS_TONES, DOC_STATUS_LABELS, type IssuePermissions, type IssueRow } from "../types";
import { ISSUE_PAGE_SIZE, type IssueFilter } from "../schemas/issue.schema";
import { useExpandableRows } from "@/shared/hooks/use-expandable-rows";
import { useStickyTableOffset } from "@/shared/hooks/use-sticky-table-offset";

import { IssueExpanded } from "./issue-expanded";

const COLUMNS: TableColumnsType<IssueRow> = [
  {
    title: "Số phiếu",
    dataIndex: "docNo",
    width: 150,
    fixed: "left",
    render: (docNo: string, row) => (
      <Link href={`/duyet-don/${row.id}`} className="font-mono">
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
        <Link href={`/don-dat/${row.orderId}`} className="font-mono">
          {orderNo}
        </Link>
      ) : (
        "—"
      ),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    render: (status: IssueRow["status"]) => (
      <StatusDot variant="badge" tone={DOC_STATUS_TONES[status]} strike={status === "DA_HUY"}>{DOC_STATUS_LABELS[status]}</StatusDot>
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
  permissions: IssuePermissions;
};

export function IssueTableBody({
  rows,
  total,
  filter,
  loading,
  onFilterChange,
  permissions,
}: Props) {
  const offsetHeader = useStickyTableOffset();
  const expandable = useExpandableRows<IssueRow>((row) => <IssueExpanded id={row.id} permissions={permissions} />);
  return (
    <Table<IssueRow>
      rowKey="id"
      size="small"
      sticky={{ offsetHeader }}
      columns={COLUMNS}
      dataSource={rows}
      loading={loading}
      {...expandable}
      scroll={{ x: 830 }}
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
