"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

// Tiền lệ đã có ở stock-in / stock-out: danh mục tra cứu (nhóm, công đoạn, kho)
// chỉ có một nguồn là hook của feature products.
import { useLookups } from "@/features/products/hooks/useProducts";

import {
  DEFAULT_INVENTORY_FILTER,
  countActiveInventoryFilters,
  type InventoryFilter,
  type StockStatus,
} from "../schemas/inventory.schema";

type Props = {
  filter: InventoryFilter;
  onChange: (next: InventoryFilter) => void;
  /** Đã thu hẹp theo phạm vi kho của thủ kho — không lấy thẳng từ danh mục kho. */
  warehouses: Array<{ id: string; name: string }>;
};

// Không option nào mang value null (Bẫy 11): "Tất cả" là trạng thái đã xóa của
// Select (`allowClear` + placeholder), đổi sang null ở `onChange`.
const STOCK_STATUS_OPTIONS: Array<{ value: StockStatus; label: string }> = [
  { value: "con_hang", label: "Còn hàng" },
  { value: "het_hang", label: "Hết hàng" },
  { value: "am", label: "Tồn âm" },
  { value: "duoi_dinh_muc", label: "Dưới định mức" },
];

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function StockFilterPanel({ filter, onChange, warehouses }: Props) {
  const lookups = useLookups();

  /**
   * Đổi điều kiện nào cũng về trang 1 — người đang ở trang 40 mà lọc hẹp lại sẽ
   * thấy màn rỗng và tưởng là lỗi.
   */
  function change(patch: Partial<InventoryFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Nhóm hàng">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Tất cả"
          value={filter.categoryId}
          options={(lookups.data?.categories ?? []).map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          onChange={(value) => change({ categoryId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Công đoạn">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Tất cả"
          value={filter.stageId}
          options={(lookups.data?.stages ?? []).map((stage) => ({
            value: stage.id,
            label: stage.name,
          }))}
          optionRender={(option) => {
            const color = lookups.data?.stages.find(
              (stage) => stage.id === option.value,
            )?.color;
            return (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: color ?? "transparent" }}
                />
                {option.label}
              </span>
            );
          }}
          onChange={(value) => change({ stageId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Kho">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.warehouseId}
          options={warehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          }))}
          onChange={(value) => change({ warehouseId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Tồn">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.stockStatus}
          options={STOCK_STATUS_OPTIONS}
          onChange={(value) => change({ stockStatus: value ?? null })}
        />
      </FilterGroup>

      <Button
        block
        disabled={countActiveInventoryFilters(filter) === 0}
        // Ô tìm nằm ngoài panel nên giữ nguyên từ khóa; giữ cả cỡ trang người dùng đã chọn.
        onClick={() =>
          onChange({
            ...DEFAULT_INVENTORY_FILTER,
            q: filter.q,
            pageSize: filter.pageSize,
          })
        }
      >
        Xóa lọc
      </Button>
    </div>
  );
}
