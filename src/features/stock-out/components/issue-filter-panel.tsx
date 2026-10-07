"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

import { DateRangeFilter } from "@/shared/components/date-range-filter";
import { PartnerSearchInput } from "@/shared/components/partner-search-input";

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
      <label className="mb-1 block text-[15px] text-chu-phu">{label}</label>
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

      <FilterGroup label="Khoảng ngày">
        <DateRangeFilter
          fromDate={filter.fromDate}
          toDate={filter.toDate}
          onChange={(range) => change(range)}
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
