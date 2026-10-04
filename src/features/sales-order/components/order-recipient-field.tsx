"use client";

import { Tag, Typography } from "antd";
import { useState } from "react";

import { partnerLabel, type OrderRecipients } from "@/shared/lib/recipient";

import {
  orderRecipientsSchema,
  type OrderRecipientsInput,
} from "../schemas/order.schema";
import { RecipientPicker, type RecipientValue } from "./recipient-picker";

type Props = {
  recipients: OrderRecipients;
  /** Trả true khi lưu xong — lỗi đã được cha báo ra màn hình. */
  onSave: (input: OrderRecipientsInput) => Promise<boolean>;
};

/**
 * Giá trị luôn lấy từ server: lưu lỗi thì ô quay về người nhận đã lưu. Mỗi lần
 * đổi gửi cả tập (dat_nguoi_nhan_don). Đơn tạm được để trống (0097) — chỉ lúc
 * Xác nhận đơn database mới đòi có người nhận.
 */
export function OrderRecipientField({ recipients, onSave }: Props) {
  const [localError, setLocalError] = useState<string | null>(null);

  function change(next: RecipientValue) {
    const parsed = orderRecipientsSchema.safeParse({
      partnerId: next.partnerId ?? null,
      staffIds: next.staffIds,
    });
    if (!parsed.success) {
      setLocalError("Đơn phải có ít nhất một người nhận.");
      return;
    }
    setLocalError(null);
    void onSave(parsed.data);
  }

  return (
    <div className="flex flex-col gap-1">
      <RecipientPicker
        partnerId={recipients.partner?.id}
        staffIds={recipients.staff.map((person) => person.id)}
        extraStaff={recipients.staff}
        onChange={change}
      />
      {localError ? (
        <Typography.Text type="danger" className="text-xs">
          {localError}
        </Typography.Text>
      ) : null}
    </div>
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
      {partner ? <span>{partnerLabel(partner)}</span> : <Tag>Nội bộ</Tag>}
      {staff.map((person) => (
        <Tag key={person.id}>{person.name}</Tag>
      ))}
    </div>
  );
}
