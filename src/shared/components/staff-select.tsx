"use client";

import { Button, Select } from "antd";

import { useInternalRecipients } from "@/shared/hooks/use-internal-recipients";
import { explainError } from "@/shared/lib/errors";
import { labelMatches } from "@/shared/lib/text";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Chọn nhân viên nhận hàng cho đơn/phiếu xuất nội bộ. Đặt ở `shared/` vì cả
 * `/dat-hang` lẫn `/hoa-don` đều dùng (CLAUDE.md: chỉ nâng lên khi ≥ 2 feature).
 */
export function StaffSelect({ value, onChange, disabled, autoFocus }: Props) {
  const staff = useInternalRecipients();

  // Hiển thị tên đầy đủ (đã chốt 02/10), nhưng gõ tên viết tắt cũng phải ra.
  const options = (staff.data ?? []).map((person) => ({
    value: person.id,
    label: person.name,
    search: `${person.shortName} ${person.name}`,
  }));

  return (
    <Select
      showSearch
      allowClear
      autoFocus={autoFocus}
      disabled={disabled}
      className="w-full"
      placeholder="Gõ tên nhân viên nhận hàng"
      value={value}
      // Bẫy 21: gõ không dấu vẫn phải ra tên có dấu.
      filterOption={(input, option) => labelMatches(input, option?.search ?? "")}
      loading={staff.isLoading}
      onChange={(selected) => onChange(selected ?? undefined)}
      options={options}
      notFoundContent={
        staff.isError ? (
          <div className="flex flex-col items-start gap-1 px-1 py-1">
            <span className="text-xs text-chu-phu">
              {`${explainError(staff.error).title}.`}
            </span>
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
  );
}
