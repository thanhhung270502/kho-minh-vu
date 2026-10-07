"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { useLookups } from "@/features/products/hooks/useProducts";
import { DateRangeFilter } from "@/shared/components/date-range-filter";
import { filterByLabel } from "@/shared/lib/text";

import {
  DEFAULT_RECEIPT_FILTER,
  countActiveReceiptFilters,
  type ReceiptFilter,
} from "../schemas/receipt.schema";
import { DOC_STATUS_LABELS } from "../types";

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[14px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function ReceiptFilterPanel({
  filter,
  onChange,
}: {
  filter: ReceiptFilter;
  onChange: (filter: ReceiptFilter) => void;
}) {
  const lookups = useLookups();
  // Danh sách NCC đang hoạt động — dùng lại RPC đối tác của Phase 2.
  const suppliers = usePartners({ ...DEFAULT_PARTNER_FILTER, kind: "NCC" });

  /** Đổi điều kiện nào cũng về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<ReceiptFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Trạng thái">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.status}
          options={(["NHAP_LIEU", "HOAN_THANH", "DA_HUY"] as const).map((status) => ({
            value: status,
            label: DOC_STATUS_LABELS[status],
          }))}
          onChange={(value) => change({ status: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Nhà cung cấp">
        <Select
          allowClear
          showSearch
          filterOption={filterByLabel}
          className="w-full"
          placeholder="Tất cả"
          value={filter.partnerId}
          loading={suppliers.isPending}
          options={(suppliers.data?.rows ?? []).map((supplier) => ({
            value: supplier.id,
            label: supplier.name,
          }))}
          onChange={(value) => change({ partnerId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Kho">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.warehouseId}
          options={(lookups.data?.warehouses ?? []).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          }))}
          onChange={(value) => change({ warehouseId: value ?? null })}
        />
      </FilterGroup>

      <FilterGroup label="Khoảng ngày">
        <DateRangeFilter
          fromDate={filter.fromDate}
          toDate={filter.toDate}
          onChange={(range) => change(range)}
        />
      </FilterGroup>

      {countActiveReceiptFilters(filter) > 0 ? (
        <Button onClick={() => onChange({ ...DEFAULT_RECEIPT_FILTER, q: filter.q })}>
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}
