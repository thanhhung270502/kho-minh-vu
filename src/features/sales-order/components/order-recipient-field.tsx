"use client";

import { Tag } from "antd";

import { partnerLabel, showsStaffOnly, type OrderRecipients } from "@/shared/lib/recipient";

import { useRecipientSaveQueue } from "../hooks/use-recipient-save-queue";
import type { OrderRecipientsInput } from "../schemas/order.schema";
import { RecipientPicker } from "./recipient-picker";

type Props = {
  recipients: OrderRecipients;
  /** Trả true khi lưu xong — lỗi đã được cha báo ra màn hình. */
  onSave: (input: OrderRecipientsInput) => Promise<boolean>;
};

/**
 * Mỗi lần đổi gửi cả tập (dat_nguoi_nhan_don), lần lượt từng lần. Đơn tạm được
 * để trống (0097) — chỉ lúc Xác nhận đơn database mới đòi có người nhận.
 */
export function OrderRecipientField({ recipients, onSave }: Props) {
  const { value, change } = useRecipientSaveQueue(
    {
      partnerId: recipients.partner?.id ?? null,
      staffIds: recipients.staff.map((person) => person.id),
    },
    onSave,
  );

  return (
    <RecipientPicker
      partnerId={value.partnerId ?? undefined}
      staffIds={value.staffIds}
      extraStaff={recipients.staff}
      onChange={(next) =>
        change({ partnerId: next.partnerId ?? null, staffIds: next.staffIds })
      }
    />
  );
}

/** Đơn đã khóa: đối tác + tên các nhân viên, không sửa được. */
export function RecipientsReadonly({
  recipients,
}: {
  recipients: OrderRecipients;
}) {
  const { partner, staff } = recipients;
  if (!partner && staff.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {partner && !showsStaffOnly(recipients) ? <span>{partnerLabel(partner)}</span> : null}
      {staff.map((person) => (
        <Tag key={person.id}>{person.name}</Tag>
      ))}
    </div>
  );
}
