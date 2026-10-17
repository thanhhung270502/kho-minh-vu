"use client";

import { Alert, App, Button, Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useReopenPostedDocument } from "../hooks/useDocuments";
import type { DocumentDetail } from "../types";

type ExtraKeys = ReadonlyArray<readonly unknown[]>;

type Props = {
  /** Đơn đặt chỉ biết số và id hóa đơn — không cần cả DocumentDetail. */
  document: Pick<DocumentDetail, "id" | "docNo" | "status" | "orderId">;
  canReopen: boolean;
  label?: string;
  /** Đường dẫn màn chi tiết của bản sửa — mỗi màn (Duyệt đơn / Nhập hàng) một route. */
  detailHref: (id: string) => string;
  /** Câu báo khi thiếu quyền — hóa đơn và phiếu nhập khác luật (0127). */
  forbiddenMessage: string;
  extraInvalidateKeys?: ExtraKeys;
};

/**
 * Sửa phiếu đã ghi sổ (0127): đảo sổ phiếu cũ, phiếu cũ đổi số "<số>-S<n>", mở bản
 * nháp mang lại số cũ để sửa rồi ghi sổ lại. Chỉ hiện khi phiếu đã ghi sổ và có quyền.
 */
export function ReopenPostedButton({
  document,
  canReopen,
  label = "Sửa phiếu",
  detailHref,
  forbiddenMessage,
  extraInvalidateKeys,
}: Props) {
  const { message } = App.useApp();
  const router = useRouter();
  const reopen = useReopenPostedDocument(document.id, { extraKeys: extraInvalidateKeys });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (document.status !== "HOAN_THANH" || !canReopen) return null;

  function close() {
    if (reopen.isPending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  // 0145: ghi chú không bắt buộc — có thì lưu vào phiếu cũ.
  async function run() {
    try {
      const draftId = await reopen.mutateAsync(reason.trim());
      message.success(`Đã mở sửa phiếu ${document.docNo} — sửa xong bấm Hoàn thành`);
      setOpen(false);
      router.push(detailHref(draftId));
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError(forbiddenMessage);
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
      <Button onClick={() => setOpen(true)}>{label}</Button>

      <Modal
        open={open}
        title={`Sửa phiếu ${document.docNo}?`}
        okText="Mở sửa"
        cancelText="Thôi"
        confirmLoading={reopen.isPending}
        mask={{ closable: false }}
        onOk={() => void run()}
        onCancel={close}
      >
        {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Tồn quay về như trước khi có phiếu này, rồi cập nhật lại theo số mới khi bấm Hoàn thành."
        />

        <Input.TextArea
          autoFocus
          rows={3}
          value={reason}
          placeholder="Ghi chú (không bắt buộc)"
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
