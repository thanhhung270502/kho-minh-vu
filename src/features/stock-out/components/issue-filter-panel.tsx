"use client";

import { Button } from "antd";
import type { ReactNode } from "react";

import { DocStatusFilter } from "@/features/documents/components/doc-status-filter";
import { useDocumentStatusCounts } from "@/features/documents/hooks/useDocuments";
import { DateRangeFilter } from "@/shared/components/date-range-filter";
import { PartnerSearchInput } from "@/shared/components/partner-search-input";

import {
  DEFAULT_ISSUE_FILTER,
  countActiveIssueFilters,
  toIssueStatusCountRpcArgs,
  type IssueFilter,
} from "../schemas/issue.schema";
import { DOC_STATUS_LABELS } from "../types";

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
  const counts = useDocumentStatusCounts("xuat", toIssueStatusCountRpcArgs(filter));

  /** Đổi điều kiện nào cũng về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<IssueFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Trạng thái">
        <DocStatusFilter
          selected={filter.statuses}
          onChange={(statuses) => change({ statuses })}
          labels={DOC_STATUS_LABELS}
          counts={counts.data}
          countsFailed={counts.isError}
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
