"use client";

import { Statistic } from "antd";

import { QueryState } from "@/shared/components/query-state";

import { useStockByWarehouse } from "../hooks/useProducts";

/** Tồn theo từng kho — trang chi tiết mã hàng và tab "Tồn kho" của dòng mở rộng. */
export function WarehouseStock({ productId, unitName }: { productId: string; unitName: string | null }) {
  const stockByWarehouse = useStockByWarehouse(productId);

  return (
    <QueryState query={stockByWarehouse} emptyDescription="Chưa có tồn — chưa có chứng từ nào cho mã này.">
      {(stocks) => (
        <div className="flex flex-wrap gap-6">
          {stocks.map((stock) => (
            <Statistic
              key={stock.warehouseId}
              title={stock.warehouseName}
              value={stock.quantity}
              suffix={unitName ?? undefined}
            />
          ))}
        </div>
      )}
    </QueryState>
  );
}
