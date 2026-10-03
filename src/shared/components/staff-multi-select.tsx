"use client";

import { Button, Select } from "antd";
import { useState } from "react";

import { useInternalRecipients } from "@/shared/hooks/use-internal-recipients";
import { explainError } from "@/shared/lib/errors";
import type { StaffRef } from "@/shared/lib/recipient";
import { labelMatches } from "@/shared/lib/text";

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Người đang ở đơn nhưng đã ngừng dùng — gộp vào options để không hiện uuid thô. */
  extraOptions?: StaffRef[];
  /** Enter khi ô tìm rỗng và đã chọn ≥ 1 người = gửi form (giữ nhịp gõ tên → Enter → Enter). */
  onEnterWhenEmpty?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
};

/**
 * Chọn nhiều nhân viên nhận hàng / phụ trách. Đặt ở `shared/` vì cả form tạo
 * đơn lẫn đầu đơn dùng (CLAUDE.md: chỉ nâng lên khi ≥ 2 nơi).
 */
export function StaffMultiSelect({
  value,
  onChange,
  extraOptions,
  onEnterWhenEmpty,
  disabled,
  autoFocus,
  placeholder = "Gõ tên nhân viên nhận hàng",
}: Props) {
  const staff = useInternalRecipients();
  const [search, setSearch] = useState("");

  const active = (staff.data ?? []).map((person) => ({
    value: person.id,
    label: person.name,
    search: `${person.shortName} ${person.name}`,
  }));
  const known = new Set(active.map((option) => option.value));
  const extra = (extraOptions ?? [])
    .filter((person) => !known.has(person.id))
    .map((person) => ({ value: person.id, label: person.name, search: person.name }));

  return (
    // Pha capture chạy TRƯỚC rc-select: nó tự focus lại ô tìm sau Enter nên
    // không thể chờ onKeyDown (bẫy 14).
    <div
      onKeyDownCapture={(event) => {
        if (
          event.key === "Enter" &&
          search.trim() === "" &&
          value.length > 0 &&
          onEnterWhenEmpty
        ) {
          event.preventDefault();
          event.stopPropagation();
          onEnterWhenEmpty();
        }
      }}
    >
      <Select
        mode="multiple"
        showSearch
        allowClear
        maxTagCount="responsive"
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full"
        placeholder={placeholder}
        value={value}
        searchValue={search}
        onSearch={setSearch}
        // Bẫy 21: gõ không dấu vẫn phải ra tên có dấu.
        filterOption={(input, option) => labelMatches(input, option?.search ?? "")}
        loading={staff.isLoading}
        onChange={(ids) => {
          setSearch("");
          onChange(ids);
        }}
        options={[...active, ...extra]}
        notFoundContent={
          staff.isError ? (
            <div className="flex flex-col items-start gap-1 px-1 py-1">
              <span className="text-xs text-chu-phu">{`${explainError(staff.error).title}.`}</span>
              <Button size="small" onClick={() => void staff.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : staff.isLoading ? (
            "Đang tải danh sách nhân viên…"
          ) : (
            <span className="text-xs text-chu-phu">
              Không có nhân viên nào khớp. Thêm hoặc bật lại nhân viên ở Cài đặt → Nhân viên phụ trách.
            </span>
          )
        }
      />
    </div>
  );
}
