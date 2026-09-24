"use client";

import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import Link from "next/link";

import type { StockCardRow } from "../types";
import { formatNumber } from "./product-columns";

/**
 * Khóa là giá trị `chung_tu.loai_ct`. Chỉ chứa loại ĐÃ có trang chi tiết thật dưới
 * `src/app/(app)/` — link tới route chưa có là trang 404 giữa luồng.
 * Chưa có route: CHUYEN_KHO, DIEU_CHINH — route đến cùng giao diện của chúng khi có.
 */
const DOC_TYPE_TO_ROUTE: Record<string, string> = {
  NHAP: "/nhap-kho",
  XUAT: "/xuat-kho",
  // Cả hai chiều trả hàng dùng chung một trang chi tiết (features/returns).
  TRA_KHACH: "/tra-hang",
  TRA_NCC: "/tra-hang",
  KIEM_KE: "/kiem-ke",
};

/** Khóa là giá trị cột `kho_movement.nguon` trong database. */
const SOURCE_LABELS: Record<string, { label: string; color?: string }> = {
  HE_THONG: { label: "Hệ thống", color: "green" },
};

export function buildStockCardColumns({
  canViewCost,
}: {
  canViewCost: boolean;
}): ColumnsType<StockCardRow> {
  return [
    {
      title: "Ngày giờ",
      dataIndex: "date",
      width: 150,
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
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
    {
      title: "Số phiếu",
      dataIndex: "docNo",
      width: 140,
      // Thiếu documentId hoặc chưa có route cho loại phiếu đó thì rơi về chữ thường, không link.
      render: (value: string, row: StockCardRow) => {
        const base = DOC_TYPE_TO_ROUTE[row.docType];
        return row.documentId && base ? (
          <Link href={`${base}/${row.documentId}`}>{value}</Link>
        ) : (
          value
        );
      },
    },
    { title: "Kho", dataIndex: "warehouseName", width: 110 },
    {
      title: "Đối tác / Ghi chú",
      key: "partner",
      ellipsis: true,
      render: (_, row) => row.partner || row.note,
    },
    {
      title: "Nhập",
      dataIndex: "quantityIn",
      width: 100,
      align: "right",
      render: (value: number) =>
        Number(value) ? (
          <span className="text-green-600">{formatNumber(value)}</span>
        ) : null,
    },
    {
      title: "Xuất",
      dataIndex: "quantityOut",
      width: 100,
      align: "right",
      render: (value: number) =>
        Number(value) ? (
          <span className="text-red-600">{formatNumber(value)}</span>
        ) : null,
    },
    ...(canViewCost
      ? [
          {
            title: "Giá vốn lúc đó",
            dataIndex: "costPriceAtTime",
            width: 130,
            align: "right" as const,
            render: formatNumber,
          },
        ]
      : []),
    {
      title: "Tồn lũy kế",
      dataIndex: "runningBalance",
      width: 120,
      align: "right",
      render: (value: number | null) =>
        value === null ? (
          <span className="text-gray-400">—</span>
        ) : (
          formatNumber(value)
        ),
    },
    {
      title: "",
      key: "reversal",
      width: 120,
      render: (_: unknown, row: StockCardRow) =>
        row.isReversal ? <Tag color="volcano">Bút toán đảo</Tag> : null,
    },
  ];
}
