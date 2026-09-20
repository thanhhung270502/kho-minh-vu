"use client";

import { Button, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { useLookups } from "@/features/products/hooks/useProducts";

import {
  DEFAULT_ISSUE_FILTER,
  countActiveIssueFilters,
  type IssueFilter,
} from "../schemas/issue.schema";
import { DOC_STATUS_LABELS, type DocStatus } from "../types";

// Bẫy 11: antd v6 bỏ hỗ trợ option có value rỗng dạng null trong danh sách
// options — mục "Tất cả" phải là một option với chuỗi rỗng làm value.
const ALL_STATUS = "";

const STATUSES: DocStatus[] = ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"];

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function IssueFilterPanel({
  filter,
  onChange,
}: {
  filter: IssueFilter;
  onChange: (filter: IssueFilter) => void;
}) {
  const lookups = useLookups();

  /** Đổi điều kiện nào cũng về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<IssueFilter>) {
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
            ...STATUSES.map((status) => ({
              value: status,
              label: DOC_STATUS_LABELS[status],
            })),
          ]}
          onChange={(selected) =>
            change({
              status: selected === ALL_STATUS ? null : (selected as DocStatus),
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

      {countActiveIssueFilters(filter) > 0 ? (
        <Button onClick={() => onChange({ ...DEFAULT_ISSUE_FILTER, q: filter.q })}>
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}
