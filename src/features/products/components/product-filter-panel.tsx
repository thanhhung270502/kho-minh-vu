"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

import { filterByLabel } from "@/shared/lib/text";

import {
  DEFAULT_PRODUCT_FILTER,
  countActiveFilters,
  type ProductFilter,
  type StockStatus,
  type TradingStatus,
} from "../schemas/filter.schema";
import type { Lookups } from "../types";

type Props = {
  filter: ProductFilter;
  lookups: Lookups | undefined;
  onChange: (filter: ProductFilter) => void;
};

const STOCK_STATUS_OPTIONS: Array<{ value: StockStatus; label: string }> = [
  { value: "con_hang", label: "Còn hàng" },
  { value: "het_hang", label: "Hết hàng" },
  { value: "am", label: "Tồn âm" },
  { value: "duoi_dinh_muc", label: "Dưới định mức" },
];

const TRADING_STATUS_OPTIONS: Array<{ value: TradingStatus; label: string }> = [
  { value: "active", label: "Đang kinh doanh" },
  { value: "inactive", label: "Ngừng kinh doanh" },
  { value: "all", label: "Tất cả" },
];

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function ProductFilterPanel({ filter, lookups, onChange }: Props) {
  /** Mọi thay đổi điều kiện đều về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<ProductFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Nhóm hàng">
        <Select
          allowClear
          showSearch
          filterOption={filterByLabel}
          className="w-full"
          placeholder="Nhóm hàng"
          value={filter.categoryId}
          options={(lookups?.categories ?? []).map((category) => ({
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
          filterOption={filterByLabel}
          className="w-full"
          placeholder="Công đoạn"
          value={filter.stageId}
          options={(lookups?.stages ?? []).map((stage) => ({
            value: stage.id,
            label: stage.name,
          }))}
          optionRender={(option) => {
            const color = lookups?.stages.find(
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

      <FilterGroup label="Đơn vị tính">
        <Select
          allowClear
          showSearch
          filterOption={filterByLabel}
          className="w-full"
          placeholder="Đơn vị tính"
          value={filter.unitId}
          options={(lookups?.units ?? []).map((unit) => ({
            value: unit.id,
            label: unit.name,
          }))}
          onChange={(value) => change({ unitId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Tồn">
        <Select
          allowClear
          className="w-full"
          placeholder="Tồn"
          value={filter.stockStatus}
          options={STOCK_STATUS_OPTIONS}
          onChange={(value) => change({ stockStatus: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Kinh doanh">
        <Select
          className="w-full"
          value={filter.tradingStatus}
          options={TRADING_STATUS_OPTIONS}
          onChange={(value) => change({ tradingStatus: value })}
        />
      </FilterGroup>

      <Button
        block
        disabled={countActiveFilters(filter) === 0}
        onClick={() =>
          onChange({ ...DEFAULT_PRODUCT_FILTER, pageSize: filter.pageSize })
        }
      >
        Xóa bộ lọc
      </Button>
    </div>
  );
}
