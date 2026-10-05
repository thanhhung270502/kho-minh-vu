"use client";

import type { ReactNode } from "react";

import { StaffSelect } from "@/shared/components/staff-select";

import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  type OrderFilter,
} from "../schemas/order.schema";
import { DateRangeFilter } from "@/shared/components/date-range-filter";
import { OrderStatusFilter } from "./order-status-filter";

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-[7px] text-[12px] font-bold text-chu-phu">{label}</div>
      {children}
    </div>
  );
}

export function OrderFilterPanel({
  filter,
  onChange,
}: {
  filter: OrderFilter;
  onChange: (filter: OrderFilter) => void;
}) {
  /** Đổi điều kiện nào cũng về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<OrderFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-baseline justify-between">
        <span className="text-[14.5px] font-extrabold">Bộ lọc</span>
        {countActiveOrderFilters(filter) > 0 ? (
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent text-[12.5px] font-semibold text-trung-tinh-350 hover:text-chu-chinh"
            onClick={() => onChange({ ...DEFAULT_ORDER_FILTER, q: filter.q })}
          >
            Xóa
          </button>
        ) : null}
      </div>

      <FilterGroup label="Trạng thái">
        <OrderStatusFilter filter={filter} onSelect={(status) => change({ status })} />
      </FilterGroup>

      <FilterGroup label="Người nhận">
        <StaffSelect
          value={filter.staffId ?? undefined}
          onChange={(id) => change({ staffId: id ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Khoảng ngày">
        <DateRangeFilter
          fromDate={filter.fromDate}
          toDate={filter.toDate}
          onChange={(range) => change(range)}
        />
      </FilterGroup>
    </div>
  );
}
