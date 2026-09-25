"use client";

import { App, Button, Tooltip, Typography } from "antd";

import { PostingSummary } from "@/shared/components/posting-summary";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { usePostReceipt } from "../hooks/useReceipts";
import type { DocumentDetail, DocumentLine } from "../types";

function formatNumber(value: number): string {
  return Number(value).toLocaleString("vi-VN");
}

type Props = {
  receipt: DocumentDetail;
  lines: DocumentLine[];
  canEdit: boolean;
};

export function PostReceiptButton({ receipt, lines, canEdit }: Props) {
  const { message, modal } = App.useApp();
  const postReceipt = usePostReceipt(receipt.id);

  if (receipt.status !== "NHAP_LIEU" || !canEdit) return null;

  // Không bắt buộc đơn giá (chốt 24/09: người dùng không dùng giá, mọi giá = 0).
  // D-04 cũ chặn ghi sổ khi đơn giá <= 0 — database chưa từng chặn, chỉ giao diện.
  const blockedReason = lines.length === 0 ? "Phiếu chưa có dòng nào." : null;

  function confirmThenPost() {
    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const totalAmount = lines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
      0,
    );
    const affectedWarehouses = [
      ...new Set(lines.map((line) => line.warehouseName).filter(Boolean)),
    ];

    modal.confirm({
      title: "Ghi sổ phiếu nhập?",
      width: 560,
      content: (
        <PostingSummary
          docNo={receipt.docNo}
          headline={
            <>
              {lines.length} dòng, tổng số lượng <strong>{formatNumber(totalQuantity)}</strong>
              {totalAmount > 0 ? (
                <>
                  , tổng tiền <strong>{formatNumber(totalAmount)}</strong>
                </>
              ) : null}
              .
            </>
          }
          warningTitle="Ghi sổ xong không sửa được"
          warningDescription="Sai thì phải hủy phiếu và lập lại. Giá vốn đã tính sẽ KHÔNG tự quay về số cũ — bình quân gia quyền là trung bình lịch sử, không hoàn tác được."
        >
          <Typography.Paragraph className="mb-0">
            Tồn sẽ tăng ở:{" "}
            <strong>{affectedWarehouses.join(", ") || (receipt.warehouseName ?? "—")}</strong>.
          </Typography.Paragraph>
        </PostingSummary>
      ),
      okText: "Ghi sổ",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await postReceipt.mutateAsync();
          message.success(`Đã ghi sổ phiếu ${receipt.docNo}`);
        } catch (error) {
          // RPC soạn sẵn câu tiếng Việt cho ca nghiệp vụ (thiếu dòng, sai
          // trạng thái, xuất quá tồn) — hiện nguyên văn, đừng dịch lại.
          if (isPostgrestError(error) && error.code === "23514") {
            message.error(error.message);
            return;
          }
          if (errorCode(error) === "42501") {
            message.error("Tài khoản không có quyền ghi sổ chứng từ.");
            return;
          }
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      },
    });
  }

  return (
    <Tooltip title={blockedReason ?? ""}>
      <Button
        type="primary"
        disabled={Boolean(blockedReason)}
        loading={postReceipt.isPending}
        onClick={confirmThenPost}
      >
        Ghi sổ
      </Button>
    </Tooltip>
  );
}
