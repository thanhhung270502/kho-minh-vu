"use client";

import { Table, Tag, Typography, theme } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import { negativeReasonLabel } from "@/features/documents/lib/negative-reasons";

import type { NegativeStockLine } from "../types";

function formatQuantity(value: number): string {
  return value.toLocaleString("vi-VN");
}

function documentHref(row: NegativeStockLine): string {
  return row.documentKind === "TRA_NCC"
    ? `/tra-hang/${row.documentId}`
    : `/duyet-don/${row.documentId}`;
}

function useColumns(): TableColumnsType<NegativeStockLine> {
  const { token } = theme.useToken();

  return [
    {
      title: "Mã hàng",
      dataIndex: "productCode",
      render: (_, row) => (
        <div>
          <div className="font-mono">{row.productCode}</div>
          <Typography.Text type="secondary" className="text-[15px]">
            {row.productName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Kho",
      dataIndex: "warehouseName",
    },
    {
      title: "SL xuất",
      dataIndex: "issuedQuantity",
      align: "right",
      render: (value: number) => formatQuantity(value),
    },
    {
      title: "Tồn sau",
      dataIndex: "balanceAfter",
      align: "right",
      sorter: (a, b) => a.balanceAfter - b.balanceAfter,
      render: (value: number) => (
        <span style={{ color: token.colorError }}>{formatQuantity(value)}</span>
      ),
    },
    {
      title: "Phiếu",
      dataIndex: "documentNumber",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Link href={documentHref(row)} className="font-mono">
            {row.documentNumber}
          </Link>
          {row.documentKind === "TRA_NCC" ? <Tag>Trả NCC</Tag> : null}
        </div>
      ),
    },
    {
      title: "Người lập",
      dataIndex: "createdBy",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Lý do",
      dataIndex: "reasonCode",
      render: (_, row) => (
        <div>
          <div>{negativeReasonLabel(row.reasonCode) ?? "Chưa ghi lý do"}</div>
          {row.reasonNote ? (
            <Typography.Text type="secondary" className="text-[15px]">
              {row.reasonNote}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
  ];
}

/** Bảng chi tiết dòng xuất âm (D-01) — mỗi dòng là một mã hàng bị một phiếu đưa tồn xuống dưới 0. */
export function NegativeStockTable({ rows }: { rows: NegativeStockLine[] }) {
  const columns = useColumns();

  return (
    <Table
      rowKey="key"
      size="small"
      columns={columns}
      dataSource={rows}
      scroll={{ x: "max-content" }}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
    />
  );
}
