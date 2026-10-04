"use client";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, DatePicker, Segmented, Select } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";
import { filterByLabel } from "@/shared/lib/text";

import { useWarehouses } from "../hooks/usePeriodAnalysis";
import {
  PERIOD_UNITS,
  PERIOD_UNIT_LABELS,
  countActivePeriodFilters,
  isCurrentPeriod,
  periodLabel,
  shiftPeriod,
  type PeriodFilter,
  type PeriodUnit,
} from "../lib/period";
import type { PeriodRow } from "../types";

const PICKER: Record<PeriodUnit, "week" | "month" | "quarter" | "year"> = {
  tuan: "week",
  thang: "month",
  quy: "quarter",
  nam: "year",
};

type Props = {
  filter: PeriodFilter;
  today: string;
  /** Nhóm hàng / xử lý lấy từ chính dữ liệu kỳ — chỉ hiện giá trị đang có. */
  rows: PeriodRow[];
  onChange: (next: PeriodFilter) => void;
};

type Option = { value: string; label: string };

function distinct(rows: PeriodRow[], pick: (r: PeriodRow) => Option | null): Option[] {
  const map = new Map<string, Option>();
  for (const r of rows) {
    const o = pick(r);
    if (o && !map.has(o.value)) map.set(o.value, o);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

/** Thanh lọc tab Phân tích: kỳ (tuần/tháng/quý/năm) + kho + quy chuẩn mã + nhóm. */
export function PeriodFilterBar({ filter, today, rows, onChange }: Props) {
  const { entries } = useCodeDictionary();
  const warehouses = useWarehouses();
  const set = (patch: Partial<PeriodFilter>) => onChange({ ...filter, ...patch });

  const options = useMemo(() => {
    const code = (loai: string, keep: (ma_hang: string | null) => boolean = () => true) =>
      entries
        .filter((e) => e.loai === loai && keep(e.ma_hang))
        .map((e) => ({ value: e.ma, label: `${e.ten} (${e.ma})` }));
    return {
      brands: code("hang"),
      models: filter.brandCode
        ? code("dong", (brand) => (brand ?? "").toUpperCase() === (filter.brandCode ?? "").toUpperCase())
        : [],
      parts: code("linh_kien"),
      stages: distinct(rows, (r) => (r.stageId ? { value: r.stageId, label: r.stageName ?? "—" } : null)),
      categories: distinct(rows, (r) => (r.categoryId ? { value: r.categoryId, label: r.categoryName ?? "—" } : null)),
    };
  }, [entries, filter.brandCode, rows]);

  const select = (placeholder: string, value: string | null, list: Option[], onSelect: (v: string | null) => void, disabled = false) => (
    <Select
      className="min-w-36"
      allowClear
      showSearch
      disabled={disabled}
      placeholder={placeholder}
      filterOption={filterByLabel}
      value={value ?? undefined}
      options={list}
      onChange={(v: string | undefined) => onSelect(v ?? null)}
    />
  );

  const active = countActivePeriodFilters(filter);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<PeriodUnit>
          value={filter.unit}
          onChange={(unit) => set({ unit, anchor: shiftPeriod(unit, filter.anchor, 0) })}
          options={PERIOD_UNITS.map((u) => ({ value: u, label: PERIOD_UNIT_LABELS[u] }))}
        />
        <div className="flex items-center gap-1">
          <Button
            icon={<LeftOutlined />}
            aria-label="Kỳ trước"
            onClick={() => set({ anchor: shiftPeriod(filter.unit, filter.anchor, -1) })}
          />
          <DatePicker
            picker={PICKER[filter.unit]}
            allowClear={false}
            value={dayjs(filter.anchor)}
            format={() => periodLabel(filter.unit, filter.anchor)}
            disabledDate={(d) => d.isAfter(dayjs(today), "day")}
            onChange={(d) => d && set({ anchor: shiftPeriod(filter.unit, d.format("YYYY-MM-DD"), 0) })}
            className="w-56"
          />
          <Button
            icon={<RightOutlined />}
            aria-label="Kỳ sau"
            disabled={isCurrentPeriod(filter.unit, filter.anchor, today)}
            onClick={() => set({ anchor: shiftPeriod(filter.unit, filter.anchor, 1) })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {select("Tất cả kho", filter.warehouseId, (warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name })), (v) => set({ warehouseId: v }))}
        {select("Hãng xe", filter.brandCode, options.brands, (v) => set({ brandCode: v, modelCode: null }))}
        {select(filter.brandCode ? "Dòng xe" : "Dòng xe (chọn hãng trước)", filter.modelCode, options.models, (v) => set({ modelCode: v }), !filter.brandCode)}
        {select("Linh kiện", filter.partCode, options.parts, (v) => set({ partCode: v }))}
        {select("Xử lý", filter.stageId, options.stages, (v) => set({ stageId: v }))}
        {select("Nhóm hàng", filter.categoryId, options.categories, (v) => set({ categoryId: v }))}
        {active > 0 ? (
          <Button
            type="link"
            onClick={() =>
              set({ warehouseId: null, brandCode: null, modelCode: null, partCode: null, stageId: null, categoryId: null })
            }
          >
            Xóa lọc ({active})
          </Button>
        ) : null}
      </div>
    </div>
  );
}
