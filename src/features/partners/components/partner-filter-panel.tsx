"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

import {
  DEFAULT_PARTNER_FILTER,
  countActivePartnerFilters,
  type ActiveStatus,
  type PartnerFilter,
} from "../types";

type Props = {
  filter: PartnerFilter;
  onChange: (patch: Partial<PartnerFilter>) => void;
};

const ACTIVE_STATUS_OPTIONS: Array<{ label: string; value: ActiveStatus }> = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Ngừng hoạt động", value: "inactive" },
  { label: "Tất cả", value: "all" },
];

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[14px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

// Không còn lọc theo loại: trang Đối tác chỉ liệt kê nhà cung cấp.
export function PartnerFilterPanel({ filter, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Trạng thái">
        <Select
          options={ACTIVE_STATUS_OPTIONS}
          value={filter.activeStatus}
          className="w-full"
          onChange={(value) => onChange({ activeStatus: value })}
        />
      </FilterGroup>

      <Button
        block
        disabled={countActivePartnerFilters(filter) === 0}
        onClick={() => onChange(DEFAULT_PARTNER_FILTER)}
      >
        Xóa bộ lọc
      </Button>
    </div>
  );
}
