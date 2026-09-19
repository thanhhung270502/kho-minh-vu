"use client";

import { Alert, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useLookups, useStockCard } from "../hooks/useProducts";
import type { StockCardRow } from "../types";
import { formatNumber } from "./product-columns";

/** Khóa là giá trị cột `kho_movement.nguon` trong database. */
const SOURCE_LABELS: Record<string, { label: string; color?: string }> = {
  HE_THONG: { label: "Hệ thống", color: "green" },
  KIOTVIET_NHAP: { label: "KiotViet · nhập" },
  KIOTVIET_BAN: { label: "KiotViet · bán" },
};

export function StockCard({
  productId,
  canViewCost,
}: {
  productId: string;
  canViewCost: boolean;
}) {
  // antd cảnh báo khi option có `value: null` — dùng chuỗi rỗng làm "tất cả",
  // đổi về null ngay khi gọi API.
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [page, setPage] = useState(1);
  const lookups = useLookups();
  const stockCard = useStockCard(productId, warehouseId || null, page);

  const columns: ColumnsType<StockCardRow> = [
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
    { title: "Số phiếu", dataIndex: "docNo", width: 140 },
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
      title: "",
      key: "reversal",
      width: 120,
      render: (_: unknown, row: StockCardRow) =>
        row.isReversal ? <Tag color="volcano">Bút toán đảo</Tag> : null,
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          className="w-52"
          value={warehouseId}
          onChange={(value) => {
            setWarehouseId(value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Tất cả kho" },
            ...(lookups.data?.warehouses ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name,
            })),
          ]}
        />
      </div>

      {warehouseId ? (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Dữ liệu KiotViet cũ không gắn kho nên chỉ hiện khi xem “Tất cả kho”."
        />
      ) : null}

      <QueryState
        query={stockCard}
        isEmpty={(result) => result.rows.length === 0}
        emptyDescription={
          warehouseId
            ? "Kho này chưa có biến động."
            : "Chưa có biến động nào. Thẻ kho ghi nhận từ phiếu nhập/xuất đầu tiên."
        }
      >
        {(result) => (
          <div className="overflow-x-auto">
            <Table<StockCardRow>
              rowKey={(row) =>
                `${row.documentId}-${row.date}-${row.docNo}-${row.quantityIn}-${row.quantityOut}`
              }
              size="small"
              columns={columns}
              dataSource={result.rows}
              loading={stockCard.isFetching && !stockCard.isPending}
              scroll={{ x: 1000 }}
              pagination={{
                current: page,
                pageSize: 50,
                total: result.total,
                showSizeChanger: false,
                showTotal: (count) => `${count.toLocaleString("vi-VN")} dòng`,
                onChange: setPage,
              }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
