"use client";

import { App, Button, Tooltip, Typography } from "antd";

import { PostingSummary } from "@/shared/components/posting-summary";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { usePostIssue } from "../hooks/useIssues";
import { negativeReasonLabel } from "../lib/negative-reasons";
import { exceedsStock, type IssueDetail, type IssueLine } from "../types";
import { NEGATIVE_PANEL_DOM_ID } from "./negative-stock-panel";

function formatNumber(value: number): string {
  return Number(value).toLocaleString("vi-VN");
}

type Props = { issue: IssueDetail; lines: IssueLine[]; canEdit: boolean };

/**
 * Chặn sớm ở client chỉ để tiện — chốt chặn thật vẫn là hàm ghi sổ ở tầng
 * database: bỏ qua giao diện gọi thẳng RPC vẫn nhận `23514` khi thiếu lý do
 * xuất âm. Lý do (nếu có) đã được `NegativeStockPanel` lưu vào đầu phiếu
 * NGAY khi người dùng chọn — `usePostIssue` ở đây gọi không kèm tham số, chỉ
 * ghi sổ trên dữ liệu đã lưu sẵn đó.
 */
export function PostIssueButton({ issue, lines, canEdit }: Props) {
  const { message, modal } = App.useApp();
  const postIssue = usePostIssue(issue.id);

  if (issue.status !== "NHAP_LIEU" || !canEdit) return null;

  const overLines = lines.filter(exceedsStock);
  const missingReason = overLines.length > 0 && !issue.negativeReason;

  const blockedReason = !lines.length
    ? "Phiếu chưa có dòng nào."
    : missingReason
      ? "Chọn lý do xuất âm trước khi ghi sổ."
      : null;

  function scrollToReasonPanel() {
    document
      .getElementById(NEGATIVE_PANEL_DOM_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function confirmThenPost() {
    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);

    modal.confirm({
      title: "Ghi sổ phiếu xuất?",
      width: 560,
      content: (
        <PostingSummary
          docNo={issue.docNo}
          headline={
            <>
              {lines.length} dòng, tổng số lượng <strong>{formatNumber(totalQuantity)}</strong>{" "}
              sẽ trừ khỏi kho.
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
                    {formatNumber(line.currentStock)} — xuất {formatNumber(line.quantity)} — sau
                    khi ghi sổ còn {formatNumber(line.currentStock - Number(line.quantity))}
                  </li>
                ))}
              </ul>
              <Typography.Paragraph className="mb-0 mt-1">
                Lý do xuất âm: <strong>{negativeReasonLabel(issue.negativeReason)}</strong>
                {issue.negativeReasonNote ? ` — ${issue.negativeReasonNote}` : ""}
              </Typography.Paragraph>
            </div>
          ) : null}
          {issue.orderId ? (
            <Typography.Paragraph className="mb-0">
              Ghi sổ xong, tiến độ đơn <strong>{issue.orderNo}</strong> sẽ cập nhật.
            </Typography.Paragraph>
          ) : null}
        </PostingSummary>
      ),
      okText: "Ghi sổ",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await postIssue.mutateAsync(undefined);
          message.success(`Đã ghi sổ phiếu ${issue.docNo}`);
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
          loading={postIssue.isPending}
          onClick={confirmThenPost}
        >
          Ghi sổ
        </Button>
      </span>
    </Tooltip>
  );
}
