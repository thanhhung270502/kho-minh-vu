"use client";

import { Alert, Select, Table } from "antd";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useLookups, useStockCard } from "../hooks/useProducts";
import type { StockCardRow } from "../types";
import { buildStockCardColumns } from "./stock-card-columns";

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

  const columns = buildStockCardColumns({ canViewCost });

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
          <>
            <div className="overflow-x-auto">
              <Table<StockCardRow>
                rowKey={(row) =>
                  `${row.documentId}-${row.date}-${row.docNo}-${row.quantityIn}-${row.quantityOut}`
                }
                size="small"
                columns={columns}
                dataSource={result.rows}
                loading={stockCard.isFetching && !stockCard.isPending}
                scroll={{ x: 1120 }}
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
            {result.rows.some((row) => row.runningBalance === null) ? (
              <p className="mt-2 text-xs text-gray-500">
                Dấu “—” ở cột Tồn lũy kế: dòng lưu trữ KiotViet, không nằm trong
                sổ cái hệ mới nên không cộng vào lũy kế.
              </p>
            ) : null}
          </>
        )}
      </QueryState>
    </>
  );
}
