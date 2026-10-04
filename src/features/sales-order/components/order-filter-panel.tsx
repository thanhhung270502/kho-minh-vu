"use client";

import { Segmented } from "antd";
import type { ReactNode } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { StaffSelect } from "@/shared/components/staff-select";
import { RECIPIENT_KIND_LABELS, type RecipientKind } from "@/shared/lib/recipient";

import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  type OrderFilter,
} from "../schemas/order.schema";
import { DateRangeFilter } from "./date-range-filter";
import { OrderStatusFilter } from "./order-status-filter";

// Bẫy 11: "Tất cả" là option value "" — antd v6 không nhận value null.
const ALL_KINDS = "";

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

      <FilterGroup label="Loại người nhận">
        <Segmented
          block
          size="small"
          value={filter.recipientKind ?? ALL_KINDS}
          options={[
            { label: "Tất cả", value: ALL_KINDS },
            { label: RECIPIENT_KIND_LABELS.internal, value: "internal" },
            { label: RECIPIENT_KIND_LABELS.partner, value: "partner" },
          ]}
          onChange={(selected) => {
            const recipientKind =
              selected === ALL_KINDS ? null : (selected as RecipientKind);
            // Lọc theo một đối tác cụ thể vô nghĩa với đơn nội bộ.
            change(
              recipientKind === "internal"
                ? { recipientKind, partnerId: null }
                : { recipientKind },
            );
          }}
        />
      </FilterGroup>

      {filter.recipientKind !== "internal" ? (
        <FilterGroup label="Đối tác nhận">
          <PartnerSearchInput
            value={filter.partnerId ?? undefined}
            onChange={(id) => change({ partnerId: id ?? null })}
          />
        </FilterGroup>
      ) : null}

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
