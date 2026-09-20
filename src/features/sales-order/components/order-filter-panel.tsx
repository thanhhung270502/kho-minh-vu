"use client";

import { Button, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";

import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "../lib/order-status";
import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  type OrderFilter,
} from "../schemas/order.schema";

// Bẫy 4/11: mục "Tất cả" phải là một option với value "" — antd v6 bỏ hỗ trợ
// option có value rỗng dạng null trong danh sách options.
const ALL_STATUS = "";

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
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
    <div className="flex flex-col gap-3">
      <FilterGroup label="Trạng thái">
        <Select
          className="w-full"
          value={filter.status ?? ALL_STATUS}
          options={[
            { value: ALL_STATUS, label: "Tất cả" },
            ...ORDER_STATUSES.map((status) => ({
              value: status,
              label: ORDER_STATUS_LABELS[status],
            })),
          ]}
          onChange={(selected) =>
            change({
              status: selected === ALL_STATUS ? null : (selected as OrderStatus),
            })
          }
        />
      </FilterGroup>

      <FilterGroup label="Người nhận">
        <PartnerSearchInput
          value={filter.partnerId ?? undefined}
          onChange={(id) => change({ partnerId: id ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Khoảng ngày">
        <DatePicker.RangePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={
            filter.fromDate && filter.toDate
              ? [dayjs(filter.fromDate), dayjs(filter.toDate)]
              : null
          }
          onChange={(range) =>
            change({
              fromDate: range?.[0] ? range[0].format("YYYY-MM-DD") : null,
              toDate: range?.[1] ? range[1].format("YYYY-MM-DD") : null,
            })
          }
        />
      </FilterGroup>

      {countActiveOrderFilters(filter) > 0 ? (
        <Button onClick={() => onChange({ ...DEFAULT_ORDER_FILTER, q: filter.q })}>
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}
