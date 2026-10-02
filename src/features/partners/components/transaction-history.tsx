"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useTransactionHistory } from "../hooks/usePartners";
import { docTypeLabel, type TransactionRow } from "../types";

/** Gọn cho panel 360px: chỉ phiếu đã ghi sổ của hệ thống (0080). */
const columns: ColumnsType<TransactionRow> = [
  {
    title: "Ngày",
    dataIndex: "date",
    width: 90,
    render: (value: string) => dayjs(value).format("DD/MM/YY"),
  },
  {
    title: "Số phiếu",
    dataIndex: "docNo",
    render: (docNo: string, row) => (
      <>
        <span className="font-mono">{docNo}</span>
        <span className="block text-xs text-chu-phu">{docTypeLabel(row.docType)}</span>
      </>
    ),
  },
  {
    title: "SL",
    dataIndex: "totalQuantity",
    width: 80,
    align: "right",
    className: "tabular-nums",
    render: (value: number) => Number(value).toLocaleString("vi-VN"),
  },
];

export function TransactionHistory({ partnerId }: { partnerId: string }) {
  const [page, setPage] = useState(1);
  const history = useTransactionHistory(partnerId, page);

  return (
    <QueryState
      query={history}
      isEmpty={(result) => result.rows.length === 0}
      emptyDescription="Chưa có phiếu nào đã ghi sổ với đối tác này."
    >
      {(result) => (
        <Table<TransactionRow>
          rowKey="documentId"
          size="small"
          columns={columns}
          dataSource={result.rows}
          loading={history.isFetching && !history.isPending}
          pagination={{
            current: page,
            pageSize: 50,
            total: result.total,
            size: "small",
            showSizeChanger: false,
            hideOnSinglePage: true,
            onChange: setPage,
          }}
        />
      )}
    </QueryState>
  );
}
