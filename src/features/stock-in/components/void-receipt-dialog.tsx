"use client";

import { Alert, App, Input, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useVoidReceipt } from "../hooks/useReceipts";
import type { DocumentDetail } from "../types";

type Props = { receipt: DocumentDetail; open: boolean; onClose: () => void };

export function VoidReceiptDialog({ receipt, open, onClose }: Props) {
  const { message } = App.useApp();
  const voidReceipt = useVoidReceipt(receipt.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPosted = receipt.status === "HOAN_THANH";

  function close() {
    if (voidReceipt.isPending) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function run() {
    if (reason.trim().length < 5) {
      setError("Nhập lý do hủy, ít nhất 5 ký tự — lý do sẽ lưu vào phiếu.");
      return;
    }

    try {
      await voidReceipt.mutateAsync(reason.trim());
      message.success(`Đã hủy phiếu ${receipt.docNo}`);
      close();
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Chỉ quản lý hủy được phiếu nhập đã ghi sổ.");
        return;
      }
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
      title={`Hủy phiếu ${receipt.docNo}?`}
      okText="Hủy phiếu"
      okButtonProps={{ danger: true }}
      cancelText="Thôi"
      confirmLoading={voidReceipt.isPending}
      onOk={() => void run()}
      onCancel={close}
    >
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

      {isPosted ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Ba điều xảy ra khi hủy phiếu đã ghi sổ"
          description={
            <ul className="mb-0 ps-4">
              <li>Tồn giảm lại bằng bút toán đảo — bản ghi gốc giữ nguyên, không xóa.</li>
              <li>
                <strong>Giá vốn KHÔNG tự quay về số trước khi nhập</strong> — bình quân gia
                quyền là trung bình lịch sử.
              </li>
              <li>Tồn có thể xuống âm nếu hàng đã xuất đi.</li>
            </ul>
          }
        />
      ) : (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Phiếu chưa ghi sổ nên chưa đụng tồn — hủy là đóng phiếu lại, không sinh bút toán nào."
        />
      )}

      <Input.TextArea
        autoFocus
        rows={3}
        value={reason}
        placeholder="Lý do hủy (lưu vào phiếu)"
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}
