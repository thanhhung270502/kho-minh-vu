"use client";

import { Alert, Input, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCancelOrder, useUnlockOrder } from "../hooks/useOrders";

type Mode = "unlock" | "cancel";

type Props = {
  mode: Mode;
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNo: string;
};

const COPY: Record<
  Mode,
  { title: (orderNo: string) => string; description: string; okText: string }
> = {
  unlock: {
    title: (orderNo) => `Sửa đơn ${orderNo}`,
    description:
      "Tồn không đổi — đơn chưa xuất hàng, chỉ mở lại để sửa.",
    okText: "Mở sửa",
  },
  cancel: {
    title: (orderNo) => `Hủy đơn ${orderNo}`,
    description:
      "Đơn chuyển sang Đã hủy, không hoàn thành hay sửa lại được nữa. Tồn không đổi vì đơn chưa xuất hàng.",
    okText: "Hủy đơn",
  },
};

/** Copy khuôn `void-receipt-dialog.tsx`: ô lý do không bắt buộc (0137), chặn
 * đóng khi đang gửi, bắt lỗi 42501/23514 riêng, fallback explainError. */
export function OrderStatusDialog({ mode, open, onClose, orderId, orderNo }: Props) {
  const unlock = useUnlockOrder(orderId);
  const cancel = useCancelOrder(orderId);
  const mutation = mode === "unlock" ? unlock : cancel;
  const copy = COPY[mode];

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (mutation.isPending) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function run() {
    try {
      await mutation.mutateAsync(reason.trim());
      close();
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Chỉ quản lý được thao tác này.");
        return;
      }
      // RPC soạn sẵn câu tiếng Việt cho ca nghiệp vụ (sai trạng thái) — hiện
      // nguyên văn, đừng dịch lại (bẫy 8: đây không phải PostgrestError thật
      // theo instanceof, dùng isPostgrestError).
      if (isPostgrestError(caught) && caught.code === "23514") {
        setError(caught.message);
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <Modal
      open={open}
      title={copy.title(orderNo)}
      okText={copy.okText}
      cancelText="Thôi"
      confirmLoading={mutation.isPending}
      mask={{ closable: false }}
      onOk={() => void run()}
      onCancel={close}
    >
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

      <Alert className="mb-3" type="info" showIcon title={copy.description} />

      <Input.TextArea
        autoFocus
        rows={3}
        value={reason}
        placeholder="Ghi chú (không bắt buộc)"
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}
