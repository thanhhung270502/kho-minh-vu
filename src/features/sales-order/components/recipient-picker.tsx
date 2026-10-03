"use client";

import { Segmented } from "antd";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { StaffMultiSelect } from "@/shared/components/staff-multi-select";
import {
  RECIPIENT_KIND_LABELS,
  RECIPIENT_KIND_ORDER,
  type RecipientKind,
  type StaffRef,
} from "@/shared/lib/recipient";

type Props = {
  kind: RecipientKind;
  partnerId: string | undefined;
  staffIds: string[];
  extraStaff?: StaffRef[];
  onKindChange: (kind: RecipientKind) => void;
  onPartnerChange: (id: string | undefined) => void;
  onStaffChange: (ids: string[]) => void;
  onEnterWhenEmpty?: () => void;
  autoFocus?: boolean;
};

const KIND_OPTIONS = RECIPIENT_KIND_ORDER.map((kind) => ({
  value: kind,
  label: RECIPIENT_KIND_LABELS[kind],
}));

/**
 * Chọn chế độ rồi chọn người (D3). Nội bộ: một hoặc nhiều nhân viên. Đối tác:
 * một đối tác + nhân viên phụ trách không bắt buộc. Đổi chế độ không xóa
 * `staffIds` — nhân viên nội bộ thành nhân viên phụ trách; chỉ cha xóa
 * `partnerId` khi về nội bộ.
 */
export function RecipientPicker({
  kind,
  partnerId,
  staffIds,
  extraStaff,
  onKindChange,
  onPartnerChange,
  onStaffChange,
  onEnterWhenEmpty,
  autoFocus,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        block
        value={kind}
        options={KIND_OPTIONS}
        onChange={(value) => onKindChange(value as RecipientKind)}
      />
      {kind === "partner" ? (
        <>
          <PartnerSearchInput value={partnerId} onChange={onPartnerChange} autoFocus={autoFocus} />
          <label className="mt-1 block text-[13px] text-chu-phu">
            Nhân viên phụ trách (không bắt buộc)
          </label>
          <StaffMultiSelect
            value={staffIds}
            onChange={onStaffChange}
            extraOptions={extraStaff}
            placeholder="Chọn nhân viên phụ trách"
          />
        </>
      ) : (
        <StaffMultiSelect
          autoFocus={autoFocus}
          value={staffIds}
          onChange={onStaffChange}
          extraOptions={extraStaff}
          onEnterWhenEmpty={onEnterWhenEmpty}
        />
      )}
    </div>
  );
}
