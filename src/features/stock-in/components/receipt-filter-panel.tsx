"use client";

import { Button, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { useLookups } from "@/features/products/hooks/useProducts";
import { filterByLabel } from "@/shared/lib/text";

import {
  DEFAULT_RECEIPT_FILTER,
  countActiveReceiptFilters,
  type ReceiptFilter,
} from "../schemas/receipt.schema";
import { DOC_STATUS_LABELS, RECEIPT_SOURCE_LABELS } from "../types";

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
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

      <FilterGroup label="Nguồn nhập">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.source}
          options={(["NCC", "NHA_MAY"] as const).map((source) => ({
            value: source,
            label: RECEIPT_SOURCE_LABELS[source],
          }))}
          onChange={(value) => change({ source: value ?? null })}
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

      {countActiveReceiptFilters(filter) > 0 ? (
        <Button onClick={() => onChange({ ...DEFAULT_RECEIPT_FILTER, q: filter.q })}>
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}
