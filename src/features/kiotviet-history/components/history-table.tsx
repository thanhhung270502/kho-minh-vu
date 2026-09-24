"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { QueryState } from "@/shared/components/query-state";

import type { KiotVietHistoryPage, KiotVietHistoryRow } from "../types";

type Props = {
  query: UseQueryResult<KiotVietHistoryPage>;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenVoucher: (type: "NHAP" | "XUAT", voucherNo: string) => void;
  /** Ẩn cột Mã hàng/Tên hàng khi bảng đã nhúng vào tab chi tiết một mã cụ thể. */
  hideProductColumns?: boolean;
};

const SOURCE_LABELS: Record<KiotVietHistoryRow["source"], { label: string; color: string }> = {
  NHAP: { label: "Nhập", color: "blue" },
  XUAT: { label: "Bán", color: "orange" },
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatHistoryDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_TIME_FORMATTER.format(date).replace(",", "");
}

function formatQuantity(value: number): string {
  return value.toLocaleString("vi-VN");
}

function buildColumns(
  onOpenVoucher: Props["onOpenVoucher"],
  hideProductColumns: boolean,
): ColumnsType<KiotVietHistoryRow> {
  return [
    {
      title: "Ngày giờ",
      dataIndex: "date",
      width: 150,
      render: (value: string | null) => formatHistoryDate(value),
    },
    {
      title: "Loại",
      dataIndex: "source",
      width: 90,
      render: (value: KiotVietHistoryRow["source"]) => (
        <Tag color={SOURCE_LABELS[value].color}>{SOURCE_LABELS[value].label}</Tag>
      ),
    },
    {
      title: "Số phiếu",
      dataIndex: "voucherNo",
      width: 140,
      render: (value: string, row: KiotVietHistoryRow) => (
        <a onClick={() => onOpenVoucher(row.source, value)}>{value}</a>
      ),
    },
    { title: "Khách / NCC", dataIndex: "partner", width: 180, ellipsis: true },
    ...(hideProductColumns
      ? []
      : ([
          { title: "Mã hàng", dataIndex: "productCode", width: 120 },
          {
            title: "Tên hàng",
            dataIndex: "productName",
            ellipsis: true,
          },
        ] satisfies ColumnsType<KiotVietHistoryRow>)),
    {
      title: "Số lượng",
      dataIndex: "quantity",
      width: 110,
      align: "right",
      render: formatQuantity,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => (value ? <span title={value}>{value}</span> : null),
    },
  ];
}

export function HistoryTable({
  query,
  page,
  pageSize,
  onPageChange,
  onOpenVoucher,
  hideProductColumns = false,
}: Props) {
  const columns = buildColumns(onOpenVoucher, hideProductColumns);

  return (
    <QueryState
      query={query}
      isEmpty={(result) => result.rows.length === 0}
      emptyDescription="Không có dòng lịch sử KiotViet nào khớp bộ lọc."
    >
      {(result) => (
        <>
          <div className="overflow-x-auto">
            <Table<KiotVietHistoryRow>
              rowKey={(row, index) => `${row.voucherNo}-${row.productCode}-${index}`}
              size="small"
              columns={columns}
              dataSource={result.rows}
              loading={query.isFetching && !query.isPending}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize,
                total: result.total,
                showSizeChanger: false,
                showTotal: (count) => `${count.toLocaleString("vi-VN")} dòng`,
                onChange: onPageChange,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Tổng nhập: {formatQuantity(result.totalIn)} · Tổng bán:{" "}
            {formatQuantity(result.totalOut)}
          </p>
        </>
      )}
    </QueryState>
  );
}
