"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useTransactionHistory } from "../hooks/usePartners";
import type { TransactionRow } from "../types";

/** Khóa là giá trị cột `nguon` trong database. */
const SOURCE_LABELS: Record<string, { label: string; color?: string }> = {
  HE_THONG: { label: "Hệ thống", color: "green" },
  KIOTVIET_NHAP: { label: "KiotViet · nhập" },
  KIOTVIET_BAN: { label: "KiotViet · bán" },
};

/** Khóa là giá trị enum `loai_ct` trong database. */
const DOC_TYPE_LABELS: Record<string, string> = { NHAP: "Nhập", XUAT: "Xuất" };

function formatNumber(value: number | string | null): string {
  return value === null ? "—" : Number(value).toLocaleString("vi-VN");
}

export function TransactionHistory({ partnerId }: { partnerId: string }) {
  const [page, setPage] = useState(1);
  const history = useTransactionHistory(partnerId, page);

  const columns: ColumnsType<TransactionRow> = [
    {
      title: "Ngày",
      dataIndex: "date",
      width: 130,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Nguồn",
      dataIndex: "source",
      width: 140,
      render: (value: string) => {
        const source = SOURCE_LABELS[value] ?? { label: value };
        return <Tag color={source.color}>{source.label}</Tag>;
      },
    },
    { title: "Số phiếu", dataIndex: "docNo", width: 150 },
    {
      title: "Loại",
      dataIndex: "docType",
      width: 90,
      render: (value: string) => DOC_TYPE_LABELS[value] ?? value,
    },
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
    { title: "Ghi chú", dataIndex: "note", ellipsis: true },
  ];

  return (
    <QueryState
      query={history}
      isEmpty={(result) => result.rows.length === 0}
      emptyDescription="Chưa có giao dịch. Với khách hàng tạo từ Rà ghi chú, hóa đơn KiotViet hiện ở đây sau khi gán ghi chú cho khách."
    >
      {(result) => (
        <div className="overflow-x-auto">
          <Table<TransactionRow>
            rowKey={(row) => `${row.source}-${row.docNo}-${row.date}`}
            size="small"
            columns={columns}
            dataSource={result.rows}
            loading={history.isFetching && !history.isPending}
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize: 50,
              total: result.total,
              showSizeChanger: false,
              showTotal: (count) => `${count.toLocaleString("vi-VN")} phiếu`,
              onChange: setPage,
            }}
          />
        </div>
      )}
    </QueryState>
  );
}
