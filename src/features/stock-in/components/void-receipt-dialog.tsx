"use client";

import { Alert, App, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useVoidReceipt } from "../hooks/useReceipts";
import type { DocumentDetail } from "../types";

type Props = { receipt: DocumentDetail; open: boolean; onClose: () => void };

export function VoidReceiptDialog({ receipt, open, onClose }: Props) {
  const { message } = App.useApp();
  const voidReceipt = useVoidReceipt(receipt.id);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (voidReceipt.isPending) return;
    setError(null);
    onClose();
  }

  // 0144: hủy phiếu nhập không cần lý do nữa — gửi chuỗi rỗng, database ghi "Hủy".
  async function run() {
    try {
      await voidReceipt.mutateAsync("");
      message.success(`Đã hủy phiếu ${receipt.docNo}`);
      close();
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Chỉ quản lý hủy được phiếu nhập đã hoàn thành.");
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
      {/* Người dùng 17/10/2026: hộp hủy chỉ giữ câu hỏi + nút, bỏ khung giải thích. */}
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}
    </Modal>
  );
}
