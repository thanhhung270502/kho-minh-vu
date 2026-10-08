"use client";

import { InternalPartnerSelect } from "@/shared/components/internal-partner-select";
import { partnerLabel, staffNames, type OrderRecipients } from "@/shared/lib/recipient";

import { useRecipientSaveQueue } from "../hooks/use-recipient-save-queue";
import type { OrderRecipientsInput } from "../schemas/order.schema";

type Props = {
  recipients: OrderRecipients;
  /** Trả true khi lưu xong — lỗi đã được cha báo ra màn hình. */
  onSave: (input: OrderRecipientsInput) => Promise<boolean>;
};

/**
 * Mỗi lần đổi gửi cả tập (dat_nguoi_nhan_don), lần lượt từng lần. Đơn tạm được
 * để trống (0097) — chỉ lúc Xác nhận đơn database mới đòi có người nhận.
 *
 * Từ 08/10/2026 chỉ chọn đối tác mã NB…; nhân viên phụ trách ẩn khỏi giao diện.
 * Nhân viên đã gắn ở đơn cũ giữ nguyên khi đổi đối tác — không xóa dữ liệu cũ.
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
    <InternalPartnerSelect
      value={value.partnerId ?? undefined}
      current={recipients.partner}
      onChange={(partnerId) => change({ partnerId: partnerId ?? null, staffIds: value.staffIds })}
    />
  );
}

/** Đơn đã khóa: chỉ hiện đối tác (nhân viên phụ trách đã ẩn — 08/10/2026). Đơn nội bộ cũ không có đối tác thì hiện tên nhân viên. */
export function RecipientsReadonly({
  recipients,
}: {
  recipients: OrderRecipients;
}) {
  const { partner, staff } = recipients;
  if (partner) return <span>{partnerLabel(partner)}</span>;
  if (staff.length === 0) return <>—</>;
  return <span>{staffNames(staff)}</span>;
}
