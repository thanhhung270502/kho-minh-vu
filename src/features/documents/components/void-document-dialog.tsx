"use client";

import { Alert, App, Button, Input, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useVoidDocument } from "../hooks/useDocuments";
import type { DocumentDetail } from "../types";

type ExtraKeys = ReadonlyArray<readonly unknown[]>;

type Props = {
  document: DocumentDetail;
  canVoid: boolean;
  extraInvalidateKeys?: ExtraKeys;
};

/**
 * Nâng từ `features/stock-out/components/void-issue-dialog.tsx` lên đây —
 * `features/returns` dùng lại nguyên vẹn. Chỉ quản lý hủy được chứng từ đã
 * ghi sổ (D-06/D-15) — hàm hủy ở tầng database chặn mọi vai trò khác. Hủy
 * sinh bút toán đảo, không xóa gì; tồn quay lại nhưng giá vốn KHÔNG quay lại.
 * Tự chứa cả nút bấm lẫn hộp thoại — chỉ hiện khi phiếu đã ghi sổ và tài
 * khoản có quyền.
 */
export function VoidDocumentDialog({ document, canVoid, extraInvalidateKeys }: Props) {
  const { message } = App.useApp();
  const voidDoc = useVoidDocument(document.id, { extraKeys: extraInvalidateKeys });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (document.status !== "HOAN_THANH" || !canVoid) return null;

  // 0139: hóa đơn hủy không bắt buộc lý do; phiếu nhập / trả vẫn bắt buộc (database cũng chặn).
  const reasonRequired = document.docType !== "XUAT";

  function close() {
    if (voidDoc.isPending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  async function run() {
    if (reasonRequired && reason.trim().length < 5) {
      setError("Nhập lý do hủy, ít nhất 5 ký tự — lý do sẽ lưu vào phiếu.");
      return;
    }
    try {
      await voidDoc.mutateAsync(reason.trim());
      message.success(`Đã hủy phiếu ${document.docNo}`);
      close();
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        // Database nói đúng quyền nào thiếu (quyền chức vụ với hóa đơn, quản lý với phiếu nhập/trả).
        setError(
          isPostgrestError(caught)
            ? `${caught.message}. Liên hệ quản lý để được cấp quyền.`
            : "Tài khoản chưa đủ quyền hủy phiếu này. Liên hệ quản lý.",
        );
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
    <>
      <Button danger onClick={() => setOpen(true)}>
        Hủy phiếu
      </Button>

      <Modal
        open={open}
        title={`Hủy phiếu ${document.docNo}?`}
        okText="Hủy phiếu"
        okButtonProps={{ danger: true }}
        cancelText="Thôi"
        confirmLoading={voidDoc.isPending}
        mask={{ closable: false }}
        onOk={() => void run()}
        onCancel={close}
      >
        {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Điều xảy ra khi hủy phiếu đã duyệt"
          description={
            <ul className="mb-0 ps-4">
              <li>Tồn quay lại lúc đầu</li>
              {document.orderId ? (
                <li>
                  Đơn đặt {document.orderNo ?? "gắn với hóa đơn này"} cũng chuyển sang Đã hủy — cần giao lại thì
                  tạo đơn mới.
                </li>
              ) : null}
            </ul>
          }
        />

        <Input.TextArea
          autoFocus
          rows={3}
          value={reason}
          placeholder={reasonRequired ? "Lý do hủy (lưu vào phiếu)" : "Lý do hủy (không bắt buộc)"}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
