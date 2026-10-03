"use client";

import { useState } from "react";

import { Card, Select, Tabs, Typography } from "antd";

// Danh mục kho: tiền lệ dùng chung ở stock-in/stock-out/inventory là hook của
// feature products.
import { useLookups } from "@/features/products/hooks/useProducts";
import { QueryState } from "@/shared/components/query-state";

import { useStockByGroup } from "../hooks/useDashboard";
import type { StockGroupBy } from "../lib/stock-drilldown";
import { StockByGroupTable } from "./stock-by-group-table";

const TABS: Array<{ key: StockGroupBy; label: string }> = [
  { key: "category", label: "Theo nhóm hàng" },
  { key: "stage", label: "Theo xử lý" },
];

/**
 * Khối "Tồn theo nhóm hàng / công đoạn" (TQAN-01) — hai tab dùng chung một
 * khuôn bảng, lọc kho, mỗi con số khác 0 mở Danh sách hàng hóa lọc sẵn (D-05..D-08).
 */
export function StockByGroupSection() {
  const [groupBy, setGroupBy] = useState<StockGroupBy>("category");
  // "" = tất cả kho (gộp mặc định, D-06); đổi sang null khi gọi hook (bẫy 11).
  const [warehouseId, setWarehouseId] = useState<string>("");

  const lookups = useLookups();
  const query = useStockByGroup(groupBy, warehouseId || null);

  return (
    <Card
      title="Tồn theo nhóm hàng / xử lý"
      extra={
        <Select
          className="w-40"
          value={warehouseId}
          onChange={setWarehouseId}
          options={[
            { value: "", label: "Tất cả kho" },
            ...(lookups.data?.warehouses ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name,
            })),
          ]}
        />
      }
    >
      <Tabs
        activeKey={groupBy}
        onChange={(key) => setGroupBy(key as StockGroupBy)}
        items={TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
      />
      <QueryState
        query={query}
        emptyDescription="Chưa có mã đang kinh doanh nào để thống kê."
      >
        {(rows) => (
          <StockByGroupTable rows={rows} groupBy={groupBy} />
        )}
      </QueryState>
      <Typography.Text type="secondary" className="mt-3 block">
        Chỉ đếm mã đang kinh doanh, giống mặc định màn Tồn kho. Bấm một con số để mở danh sách.
      </Typography.Text>
    </Card>
  );
}
