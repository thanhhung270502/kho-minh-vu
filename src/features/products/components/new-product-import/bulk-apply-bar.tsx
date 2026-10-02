"use client";

import { Button, Input, Select } from "antd";

import { filterByLabel } from "@/shared/lib/text";

import type { DraftFields } from "../../lib/new-product-import";
import type { Lookups } from "../../types";

type Props = {
  count: number;
  lookups: Lookups | undefined;
  onApply: (patch: Partial<DraftFields>) => void;
  onClear: () => void;
};

const YES_NO = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

/** Gán một giá trị cho mọi dòng đang chọn (IMP-02). Ô quay về trống sau mỗi lần gán. */
export function BulkApplyBar({ count, lookups, onApply, onClear }: Props) {
  if (count === 0) {
    return (
      <p className="mb-2 text-xs text-chu-phu">
        Chọn nhiều dòng (ô vuông đầu dòng) để gán loại hàng, nhóm, dòng xe, ĐVT… một lần.
      </p>
    );
  }

  const lookupSelect = (
    placeholder: string,
    items: { id: string; name: string }[] | undefined,
    toPatch: (id: string) => Partial<DraftFields>,
  ) => (
    <Select
      showSearch
      size="small"
      className="w-40"
      placeholder={placeholder}
      value={null}
      filterOption={filterByLabel}
      options={(items ?? []).map((item) => ({ value: item.id, label: item.name }))}
      onChange={(id: string) => onApply(toPatch(id))}
    />
  );

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded bg-brand-25 p-2">
      <span className="text-sm font-medium">Gán cho {count} dòng đã chọn:</span>
      {lookupSelect("Loại hàng…", lookups?.productTypes, (id) => ({ productTypeId: id }))}
      {lookupSelect("Nhóm hàng…", lookups?.categories, (id) => ({ categoryId: id }))}
      {lookupSelect("Dòng xe…", lookups?.vehicleLines, (id) => ({ vehicleLineId: id }))}
      {lookupSelect("ĐVT…", lookups?.units, (id) => ({ unitId: id }))}
      <Select
        size="small"
        className="w-32"
        placeholder="Đang KD…"
        value={null}
        options={YES_NO}
        onChange={(value: string) => onApply({ isActive: value === "yes" })}
      />
      <Select
        size="small"
        className="w-36"
        placeholder="Bán trực tiếp…"
        value={null}
        options={YES_NO}
        onChange={(value: string) => onApply({ directSale: value === "yes" })}
      />
      <Input.Search
        size="small"
        className="w-40"
        placeholder="Vị trí…"
        enterButton="Gán"
        maxLength={50}
        onSearch={(value, _event, info) => {
          if (info?.source === "clear") return;
          onApply({ shelfLocation: value.trim() });
        }}
      />
      <Button size="small" type="link" onClick={onClear}>
        Bỏ chọn
      </Button>
    </div>
  );
}
