"use client";

import { Alert, App, Button, Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useReopenPostedDocument } from "../hooks/useDocuments";
import type { DocumentDetail } from "../types";

type ExtraKeys = ReadonlyArray<readonly unknown[]>;

type Props = {
  document: DocumentDetail;
  canReopen: boolean;
  /** Đường dẫn màn chi tiết của bản sửa — mỗi màn (Duyệt đơn / Nhập hàng) một route. */
  detailHref: (id: string) => string;
  /** Câu báo khi thiếu quyền — hóa đơn và phiếu nhập khác luật (0124). */
  forbiddenMessage: string;
  extraInvalidateKeys?: ExtraKeys;
};

/**
 * Sửa phiếu đã ghi sổ (0124): đảo sổ phiếu cũ, phiếu cũ đổi số "<số>-S<n>", mở bản
 * nháp mang lại số cũ để sửa rồi ghi sổ lại. Chỉ hiện khi phiếu đã ghi sổ và có quyền.
 */
export function ReopenPostedButton({
  document,
  canReopen,
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

  async function run() {
    if (reason.trim().length < 5) {
      setError("Nhập lý do sửa, ít nhất 5 ký tự — lý do lưu vào phiếu cũ.");
      return;
    }
    try {
      const draftId = await reopen.mutateAsync(reason.trim());
      message.success(`Đã mở sửa phiếu ${document.docNo} — sửa xong bấm Ghi sổ`);
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
      <Button onClick={() => setOpen(true)}>Sửa phiếu</Button>

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
          type="warning"
          showIcon
          title="Điều xảy ra khi sửa phiếu đã ghi sổ"
          description={
            <ul className="mb-0 ps-4">
              <li>
                Phiếu hiện tại được đảo sổ và lưu lại với số {document.docNo}-S… để truy vết trên
                thẻ kho.
              </li>
              <li>
                Một phiếu nháp mang lại số {document.docNo} mở ra để sửa —{" "}
                <strong>tồn chỉ cập nhật lại khi bấm Ghi sổ</strong>.
              </li>
              {document.orderId ? (
                <li>Ghi sổ xong, dòng của đơn đặt hàng được chép lại theo hóa đơn đã sửa.</li>
              ) : null}
            </ul>
          }
        />

        <Input.TextArea
          autoFocus
          rows={3}
          value={reason}
          placeholder="Lý do sửa (lưu vào phiếu cũ)"
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
