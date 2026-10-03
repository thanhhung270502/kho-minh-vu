"use client";

import { Alert, App, Input, Modal, Select } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  NEGATIVE_REASONS,
  NEGATIVE_REASON_LABELS,
  type NegativeReasonCode,
} from "@/features/documents/lib/negative-reasons";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCompleteOrder } from "../hooks/useOrders";
import { needsNegativeReason } from "../lib/complete-order";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNo: string;
  lineCount: number;
  orderedQuantity: number;
};

/**
 * Hoàn thành đơn (DON-03): một lần bấm là tạo + ghi sổ hóa đơn. Lần đầu gọi
 * KHÔNG kèm lý do; database báo xuất âm thì hỏi lý do rồi gọi lại — chỉ
 * database biết chính xác dòng nào làm tồn âm ở kho nào.
 */
export function CompleteOrderDialog({ open, onClose, orderId, orderNo, lineCount, orderedQuantity }: Props) {
  const { message } = App.useApp();
  const router = useRouter();
  const complete = useCompleteOrder(orderId);

  const [negative, setNegative] = useState<string | null>(null);
  const [reason, setReason] = useState<NegativeReasonCode | undefined>();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (complete.isPending) return;
    setNegative(null);
    setReason(undefined);
    setNote("");
    setError(null);
    onClose();
  }

  async function run() {
    if (negative && !reason) {
      setError("Chọn lý do xuất âm trước khi hoàn thành.");
      return;
    }
    if (reason === "KHAC" && !note.trim()) {
      setError("Chọn “Khác” thì ghi rõ lý do.");
      return;
    }
    setError(null);

    try {
      const invoiceId = await complete.mutateAsync(
        negative && reason ? { code: reason, note: note.trim() || null } : undefined,
      );
      message.success(`Đã hoàn thành đơn ${orderNo} — hóa đơn đã ghi sổ.`);
      close();
      router.push(`/duyet-don/${invoiceId}`);
    } catch (caught) {
      if (needsNegativeReason(caught)) {
        // Nguyên văn câu của ghi_so_chung_tu: nêu mã, tồn và số xuất.
        setNegative(isPostgrestError(caught) ? caught.message : "Có dòng xuất quá tồn.");
        return;
      }
      if (errorCode(caught) === "42501") {
        setError("Tài khoản không có quyền hoàn thành đơn. Nhờ quản lý hoặc văn phòng thao tác.");
        return;
      }
      // 23514 nghiệp vụ (đơn vừa bị mở khóa, mã thiếu kho mặc định…) — RPC đã
      // soạn câu tiếng Việt, hiện nguyên văn (bẫy 8).
      if (isPostgrestError(caught) && caught.code === "23514") {
        setError(caught.message);
        return;
      }
      if (errorCode(caught) === "23505") {
        setError("Đơn này đã có hóa đơn. Tải lại trang để xem.");
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <Modal
      open={open}
      title={`Hoàn thành đơn ${orderNo}?`}
      okText={negative ? "Hoàn thành, xuất âm" : "Hoàn thành"}
      okButtonProps={negative ? { danger: true } : undefined}
      cancelText="Thôi"
      confirmLoading={complete.isPending}
      mask={{ closable: false }}
      onOk={() => void run()}
      onCancel={close}
    >
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

      <p className="mb-3">
        Ghi sổ hóa đơn {lineCount} dòng, tổng {orderedQuantity.toLocaleString("vi-VN")} — trừ tồn
        ngay theo kho mặc định của từng mã. Sai thì quản lý hủy hóa đơn, đơn quay về Đã xác nhận.
      </p>

      {negative ? (
        <>
          <Alert className="mb-3" type="warning" showIcon title="Có dòng xuất quá tồn" description={negative} />
          <Select<NegativeReasonCode>
            className="mb-2 w-full"
            placeholder="Chọn lý do xuất âm"
            value={reason}
            onChange={setReason}
            options={NEGATIVE_REASONS.map((code) => ({ value: code, label: NEGATIVE_REASON_LABELS[code] }))}
          />
          <Input.TextArea
            rows={2}
            value={note}
            placeholder={reason === "KHAC" ? "Ghi rõ lý do (bắt buộc)" : "Ghi chú thêm (không bắt buộc)"}
            onChange={(event) => setNote(event.target.value)}
          />
        </>
      ) : null}
    </Modal>
  );
}
