"use client";

import { App, Button } from "antd";
import { useRouter } from "next/navigation";

import type { DocumentDetail } from "@/features/documents/types";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCreateReturn } from "../hooks/useReturns";

type Props = { document: DocumentDetail; canEdit: boolean };

/**
 * D-15/XUAT-09: nút sinh phiếu trả từ chứng từ GỐC đã ghi sổ — RPC
 * `tao_phieu_tra` tự suy loại trả từ `document.docType`, không nhận tham số
 * chọn loại (04-04-SUMMARY.md). Nhãn nút cũng suy từ `docType` — chỉ trang
 * trí hiển thị, KHÔNG truyền gì vào lệnh gọi RPC.
 *
 * Chỉ hiện khi chứng từ gốc ĐÃ GHI SỔ (D-15 nói rõ tạo từ chứng từ đã ghi
 * sổ) và tài khoản có quyền sửa — chốt chặn thật vẫn ở RPC (`23514`/`42501`).
 */
export function ReturnButton({ document, canEdit }: Props) {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const createReturn = useCreateReturn();

  const label =
    document.docType === "XUAT"
      ? "Khách trả hàng"
      : document.docType === "NHAP"
        ? "Trả hàng NCC"
        : null;

  if (label === null || document.status !== "HOAN_THANH" || !canEdit) return null;

  const direction = document.docType === "XUAT" ? "tăng" : "giảm";

  function confirmThenCreate() {
    modal.confirm({
      title: `Sinh phiếu trả từ ${document.docNo}?`,
      content: `Dòng bê nguyên sang từ ${document.docNo}. Sửa lại số trả ở từng dòng rồi ghi sổ. Tồn sẽ ${direction} sau khi ghi sổ.`,
      okText: "Sinh phiếu trả",
      cancelText: "Thôi",
      onOk: async () => {
        try {
          const id = await createReturn.mutateAsync(document.id);
          router.push(`/tra-hang/${id}`);
        } catch (error) {
          if (isPostgrestError(error) && error.code === "23514") {
            message.error(error.message);
            return;
          }
          if (errorCode(error) === "42501") {
            message.error("Tài khoản không có quyền tạo phiếu trả hàng.");
            return;
          }
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      },
    });
  }

  return (
    <Button loading={createReturn.isPending} onClick={confirmThenCreate}>
      {label}
    </Button>
  );
}
