"use client";

import { Button, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";

import {
  countActiveHistoryFilters,
  DEFAULT_HISTORY_FILTER,
  type KiotVietHistoryFilter,
} from "../schemas/history-filter.schema";

type Props = {
  value: KiotVietHistoryFilter;
  onChange: (next: KiotVietHistoryFilter) => void;
};

// Không option nào mang value null (Bẫy 11 CLAUDE.md): "Tất cả" là chuỗi rỗng.
const TYPE_OPTIONS: Array<{ value: KiotVietHistoryFilter["type"]; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "NHAP", label: "Nhập" },
  { value: "XUAT", label: "Bán" },
];

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function HistoryFilterPanel({ value, onChange }: Props) {
  /**
   * Đổi điều kiện nào cũng về trang 1 — người đang ở trang xa mà lọc hẹp lại
   * sẽ thấy màn rỗng và tưởng là lỗi.
   */
  function change(patch: Partial<KiotVietHistoryFilter>) {
    onChange({ ...value, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Loại">
        <Select
          className="w-full"
          value={value.type}
          options={TYPE_OPTIONS}
          onChange={(next) => change({ type: next })}
        />
      </FilterGroup>

      <FilterGroup label="Khoảng ngày">
        <DatePicker.RangePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={[
            value.from ? dayjs(value.from) : null,
            value.to ? dayjs(value.to) : null,
          ]}
          onChange={(dates) =>
            change({
              from: dates?.[0] ? dates[0].format("YYYY-MM-DD") : "",
              to: dates?.[1] ? dates[1].format("YYYY-MM-DD") : "",
            })
          }
        />
      </FilterGroup>

      <FilterGroup label="Mã hàng">
        <Input
          allowClear
          value={value.productCode}
          placeholder="Vd: OP-001"
          onChange={(event) => change({ productCode: event.target.value })}
        />
      </FilterGroup>

      <FilterGroup label="Số phiếu / hóa đơn">
        <Input
          allowClear
          value={value.voucherNo}
          placeholder="Vd: PN123, HD456"
          onChange={(event) => change({ voucherNo: event.target.value })}
        />
      </FilterGroup>

      <Button
        block
        disabled={countActiveHistoryFilters(value) === 0}
        // Ô tìm nằm ngoài panel nên giữ nguyên từ khóa.
        onClick={() =>
          onChange({
            ...DEFAULT_HISTORY_FILTER,
            keyword: value.keyword,
            pageSize: value.pageSize,
          })
        }
      >
        Xóa lọc
      </Button>
    </div>
  );
}
