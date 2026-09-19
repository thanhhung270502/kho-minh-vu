"use client";

import { Button, Segmented, Select } from "antd";
import type { ReactNode } from "react";

import {
  DEFAULT_PARTNER_FILTER,
  countActivePartnerFilters,
  PARTNER_KIND_LABELS,
  type ActiveStatus,
  type PartnerFilter,
  type PartnerKind,
} from "../types";

type Props = {
  filter: PartnerFilter;
  onChange: (patch: Partial<PartnerFilter>) => void;
};

const ALL_KINDS = "tat_ca";

const KIND_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Tất cả", value: ALL_KINDS },
  ...(["NCC", "KHACH", "CA_HAI"] as PartnerKind[]).map((kind) => ({
    label: PARTNER_KIND_LABELS[kind],
    value: kind,
  })),
];

const ACTIVE_STATUS_OPTIONS: Array<{ label: string; value: ActiveStatus }> = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Ngừng hoạt động", value: "inactive" },
  { label: "Tất cả", value: "all" },
];

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function PartnerFilterPanel({ filter, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Loại đối tác">
        <Segmented
          block
          vertical
          options={KIND_OPTIONS}
          value={filter.kind ?? ALL_KINDS}
          onChange={(value) =>
            onChange({ kind: value === ALL_KINDS ? null : (value as PartnerKind) })
          }
        />
      </FilterGroup>

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
