"use client";

import { Segmented } from "antd";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { StaffSelect } from "@/shared/components/staff-select";
import {
  RECIPIENT_KIND_LABELS,
  RECIPIENT_KIND_ORDER,
  type RecipientKind,
} from "@/shared/lib/recipient";

type Props = {
  kind: RecipientKind;
  id: string | undefined;
  onKindChange: (kind: RecipientKind) => void;
  onIdChange: (id: string | undefined) => void;
  autoFocus?: boolean;
};

const KIND_OPTIONS = RECIPIENT_KIND_ORDER.map((kind) => ({
  value: kind,
  label: RECIPIENT_KIND_LABELS[kind],
}));

/**
 * Chọn chế độ người nhận rồi chọn người. Đổi chế độ là đổi hẳn ô chọn bên
 * dưới — id của chế độ cũ không còn nghĩa, cha phải tự xóa nó trong
 * `onKindChange`.
 */
export function RecipientPicker({ kind, id, onKindChange, onIdChange, autoFocus }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        block
        value={kind}
        options={KIND_OPTIONS}
        onChange={(value) => onKindChange(value as RecipientKind)}
      />
      {kind === "partner" ? (
        <PartnerSearchInput value={id} onChange={onIdChange} autoFocus={autoFocus} />
      ) : (
        <StaffSelect value={id} onChange={onIdChange} autoFocus={autoFocus} />
      )}
    </div>
  );
}
