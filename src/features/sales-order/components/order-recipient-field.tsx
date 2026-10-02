"use client";

import { Typography } from "antd";
import { useState } from "react";

import {
  DEFAULT_RECIPIENT_KIND,
  type Recipient,
  type RecipientChoice,
  type RecipientKind,
} from "@/shared/lib/recipient";

import { RecipientPicker } from "./recipient-picker";

type Props = {
  recipient: Recipient | null;
  /** Trả true khi lưu xong — lỗi đã được cha báo ra màn hình. */
  onSave: (choice: RecipientChoice) => Promise<boolean>;
};

/**
 * Đổi chế độ chưa lưu gì: chưa có người thì không có gì để ghi, và CHECK
 * database cấm đơn không có người nhận. Đơn giữ người nhận cũ tới lúc chọn.
 */
export function OrderRecipientField({ recipient, onSave }: Props) {
  const savedKind: RecipientKind = recipient?.kind ?? DEFAULT_RECIPIENT_KIND;
  const [pendingKind, setPendingKind] = useState<RecipientKind | null>(null);
  const kind = pendingKind ?? savedKind;
  const switching = pendingKind !== null && pendingKind !== savedKind;

  async function pick(id: string | undefined) {
    if (!id) return;
    const saved = await onSave({ kind, id });
    if (saved) setPendingKind(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <RecipientPicker
        kind={kind}
        id={recipient?.kind === kind ? recipient.id : undefined}
        onKindChange={(next) => setPendingKind(next === savedKind ? null : next)}
        onIdChange={(id) => void pick(id)}
      />
      {switching ? (
        <Typography.Text type="secondary" className="text-xs">
          {kind === "internal"
            ? "Chọn nhân viên để chuyển thành đơn nội bộ."
            : "Chọn đối tác để chuyển thành đơn đối tác."}{" "}
          Đơn vẫn giữ người nhận cũ tới khi chọn xong.
        </Typography.Text>
      ) : null}
    </div>
  );
}
