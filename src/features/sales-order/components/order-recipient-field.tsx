"use client";

import { Button, Tag, Typography } from "antd";
import { useState } from "react";

import {
  partnerLabel,
  recipientKindOf,
  type OrderRecipients,
  type RecipientKind,
} from "@/shared/lib/recipient";

import type { OrderRecipientsInput } from "../schemas/order.schema";
import { RecipientPicker } from "./recipient-picker";

type Props = {
  recipients: OrderRecipients;
  /** Trả true khi lưu xong — lỗi đã được cha báo ra màn hình. */
  onSave: (input: OrderRecipientsInput) => Promise<boolean>;
};

/**
 * Giá trị luôn lấy từ server: lưu lỗi thì ô quay về người nhận đã lưu. Đổi chế
 * độ chưa lưu gì (CHECK database cấm đơn không có người nhận) — đơn giữ người
 * nhận cũ tới lúc chọn xong. Mỗi lần đổi gửi cả tập (dat_nguoi_nhan_don).
 */
export function OrderRecipientField({ recipients, onSave }: Props) {
  const savedKind = recipientKindOf(recipients);
  const savedStaffIds = recipients.staff.map((person) => person.id);
  const savedPartnerId = recipients.partner?.id;
  const [pendingKind, setPendingKind] = useState<RecipientKind | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const kind = pendingKind ?? savedKind;
  const switching = pendingKind !== null && pendingKind !== savedKind;

  async function save(input: OrderRecipientsInput) {
    setLocalError(null);
    const saved = await onSave(input);
    if (saved) setPendingKind(null);
  }

  function changeStaff(ids: string[]) {
    if (kind === "internal") {
      if (ids.length === 0) {
        setLocalError("Đơn nội bộ phải có ít nhất một người nhận.");
        return;
      }
      void save({ partnerId: null, staffIds: ids });
      return;
    }
    if (!savedPartnerId) {
      setLocalError("Chọn đối tác trước, rồi mới chọn nhân viên phụ trách.");
      return;
    }
    void save({ partnerId: savedPartnerId, staffIds: ids });
  }

  return (
    <div className="flex flex-col gap-1">
      <RecipientPicker
        kind={kind}
        partnerId={savedPartnerId}
        staffIds={savedStaffIds}
        extraStaff={recipients.staff}
        onKindChange={(next) => {
          setLocalError(null);
          setPendingKind(next === savedKind ? null : next);
        }}
        onPartnerChange={(id) => {
          if (id) void save({ partnerId: id, staffIds: savedStaffIds });
        }}
        onStaffChange={changeStaff}
      />
      {localError ? (
        <Typography.Text type="danger" className="text-xs">
          {localError}
        </Typography.Text>
      ) : null}
      {switching ? (
        <Typography.Text type="secondary" className="text-xs">
          {kind === "internal"
            ? "Chọn nhân viên để chuyển thành đơn nội bộ."
            : "Chọn đối tác để chuyển thành đơn đối tác."}{" "}
          Đơn vẫn giữ người nhận cũ tới khi chọn xong.
        </Typography.Text>
      ) : null}
      {switching && kind === "internal" && savedStaffIds.length > 0 ? (
        <Button
          size="small"
          className="self-start"
          onClick={() => void save({ partnerId: null, staffIds: savedStaffIds })}
        >
          Chuyển sang Nội bộ
        </Button>
      ) : null}
    </div>
  );
}

/** Đơn đã khóa: đối tác + tên các nhân viên, không sửa được. */
export function RecipientsReadonly({ recipients }: { recipients: OrderRecipients }) {
  const { partner, staff } = recipients;
  if (!partner && staff.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {partner ? <span>{partnerLabel(partner)}</span> : <Tag>Nội bộ</Tag>}
      {staff.map((person) => (
        <Tag key={person.id}>{person.name}</Tag>
      ))}
    </div>
  );
}
