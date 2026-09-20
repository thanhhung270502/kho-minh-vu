"use client";

import { App, Button, Tooltip, Typography } from "antd";

import { PostingSummary } from "@/shared/components/posting-summary";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { usePostDocument } from "../hooks/useDocuments";
import { DOC_TYPE_ACTION_LABEL, DOC_TYPE_STOCK_VERB, documentCanGoNegative } from "../lib/doc-type-labels";
import { negativeReasonLabel } from "../lib/negative-reasons";
import { exceedsStock, type DocumentDetail, type DocumentLine } from "../types";
import { NEGATIVE_PANEL_DOM_ID } from "./negative-stock-panel";

function formatNumber(value: number): string {
  return Number(value).toLocaleString("vi-VN");
}

type ExtraKeys = ReadonlyArray<readonly unknown[]>;

type Props = {
  document: DocumentDetail;
  lines: DocumentLine[];
  canEdit: boolean;
  /** Cache riêng của chiều gọi (vd `orderKeys.all` cho `stock-out`) — làm mới thêm sau khi ghi sổ. */
  extraInvalidateKeys?: ExtraKeys;
};

/**
 * Nâng từ `features/stock-out/components/post-issue-button.tsx` lên đây —
 * `features/returns` (plan 04-14) dùng lại nguyên vẹn cho `TRA_KHACH`/`TRA_NCC`.
 * Nhãn và câu tóm tắt suy từ `document.docType` (`lib/doc-type-labels.ts`) thay
 * vì hard-code "phiếu xuất" như bản gốc.
 *
 * Chặn sớm ở client chỉ để tiện — chốt chặn thật vẫn là hàm ghi sổ ở tầng
 * database: bỏ qua giao diện gọi thẳng RPC vẫn nhận `23514` khi thiếu lý do
 * xuất âm. Lý do (nếu có) đã được `NegativeStockPanel` lưu vào đầu phiếu
 * NGAY khi người dùng chọn — hook ở đây gọi không kèm tham số, chỉ ghi sổ
 * trên dữ liệu đã lưu sẵn đó.
 */
export function PostDocumentButton({ document, lines, canEdit, extraInvalidateKeys }: Props) {
  const { message, modal } = App.useApp();
  const postDoc = usePostDocument(document.id, { extraKeys: extraInvalidateKeys });

  if (document.status !== "NHAP_LIEU" || !canEdit) return null;

  const canGoNegative = documentCanGoNegative(document.docType);
  const overLines = canGoNegative ? lines.filter(exceedsStock) : [];
  const missingReason = overLines.length > 0 && !document.negativeReason;

  const blockedReason = !lines.length
    ? "Phiếu chưa có dòng nào."
    : missingReason
      ? "Chọn lý do xuất âm trước khi ghi sổ."
      : null;

  function scrollToReasonPanel() {
    globalThis.document
      .getElementById(NEGATIVE_PANEL_DOM_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function confirmThenPost() {
    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const actionLabel = DOC_TYPE_ACTION_LABEL[document.docType];
    const stockVerb = DOC_TYPE_STOCK_VERB[document.docType];

    modal.confirm({
      title: `Ghi sổ ${actionLabel}?`,
      width: 560,
      content: (
        <PostingSummary
          docNo={document.docNo}
          headline={
            <>
              {lines.length} dòng, tổng số lượng <strong>{formatNumber(totalQuantity)}</strong>{" "}
              {stockVerb}.
            </>
          }
          warningTitle="Ghi sổ xong phiếu khóa lại"
          warningDescription="Muốn sửa phải hủy phiếu — hủy phiếu đã ghi sổ chỉ quản lý làm được."
        >
          {overLines.length > 0 ? (
            <div>
              <Typography.Text strong>Dòng vượt tồn:</Typography.Text>
              <ul className="mb-0 ps-4">
                {overLines.map((line) => (
                  <li key={line.id}>
                    {line.productCode} — {line.warehouseName ?? "—"} — tồn{" "}
                    {formatNumber(line.currentStock)} — số ghi sổ {formatNumber(line.quantity)} —
                    sau khi ghi sổ còn {formatNumber(line.currentStock - Number(line.quantity))}
                  </li>
                ))}
              </ul>
              <Typography.Paragraph className="mb-0 mt-1">
                Lý do xuất âm:{" "}
                <strong>{negativeReasonLabel(document.negativeReason)}</strong>
                {document.negativeReasonNote ? ` — ${document.negativeReasonNote}` : ""}
              </Typography.Paragraph>
            </div>
          ) : null}
          {document.orderId ? (
            <Typography.Paragraph className="mb-0">
              Ghi sổ xong, tiến độ đơn <strong>{document.orderNo}</strong> sẽ cập nhật.
            </Typography.Paragraph>
          ) : null}
        </PostingSummary>
      ),
      okText: "Ghi sổ",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await postDoc.mutateAsync(undefined);
          message.success(`Đã ghi sổ phiếu ${document.docNo}`);
        } catch (error) {
          // RPC soạn sẵn câu tiếng Việt cho ca nghiệp vụ (thiếu lý do, sai
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
      <span onClick={missingReason ? scrollToReasonPanel : undefined}>
        <Button
          type="primary"
          disabled={Boolean(blockedReason)}
          loading={postDoc.isPending}
          onClick={confirmThenPost}
        >
          Ghi sổ
        </Button>
      </span>
    </Tooltip>
  );
}
