"use client";

import { Alert, Input, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCloseOrderEarly, useUnlockOrder } from "../hooks/useOrders";

type Mode = "unlock" | "close-early";

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
    title: (orderNo) => `Mở khóa đơn ${orderNo}`,
    description:
      "Đơn quay về trạng thái Đơn tạm, văn phòng sửa lại được. Lần mở khóa này được ghi vào nhật ký sửa.",
    okText: "Mở khóa",
  },
  "close-early": {
    title: (orderNo) => `Đóng sớm đơn ${orderNo}`,
    description:
      "Đơn chuyển sang Hoàn thành dù chưa giao đủ. Dùng khi khách không lấy nốt phần còn lại.",
    okText: "Đóng sớm",
  },
};

/** Copy khuôn `void-receipt-dialog.tsx`: ô lý do bắt buộc ≥ 5 ký tự, chặn
 * đóng khi đang gửi, bắt lỗi 42501/23514 riêng, fallback explainError. */
export function OrderStatusDialog({ mode, open, onClose, orderId, orderNo }: Props) {
  const unlock = useUnlockOrder(orderId);
  const closeEarly = useCloseOrderEarly(orderId);
  const mutation = mode === "unlock" ? unlock : closeEarly;
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
    if (reason.trim().length < 5) {
      setError("Nhập lý do, ít nhất 5 ký tự — lý do sẽ lưu vào nhật ký sửa.");
      return;
    }

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
        placeholder="Lý do (lưu vào nhật ký sửa)"
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}
