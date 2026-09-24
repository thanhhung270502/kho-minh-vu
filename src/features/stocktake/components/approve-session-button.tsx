"use client";

import { App, Button, Tooltip, Typography } from "antd";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useApproveSession } from "../hooks/useStocktake";

type Props = {
  sessionId: string;
  acceptZeroProductIds: string[];
  blockers: string[];
  canApprove: boolean;
  editable: boolean;
};

/**
 * Nút duyệt phiên kiểm kê — khuôn `post-document-button.tsx` (hộp xác nhận
 * tóm tắt hậu quả + nút loading chống bấm lặp + phân biệt lỗi 42501/23514).
 * Chặn ở client chỉ để tiện — chốt chặn thật là RPC `duyet_phien_kiem_ke`
 * (T-06-52/T-06-53/T-06-55).
 */
export function ApproveSessionButton({
  sessionId,
  acceptZeroProductIds,
  blockers,
  canApprove,
  editable,
}: Props) {
  const { message, modal } = App.useApp();
  const approve = useApproveSession(sessionId);

  if (!editable) return null;

  const disabledReason = !canApprove
    ? 'Cần quyền "Duyệt kiểm kê" — nhờ quản lý bật trong Cài đặt → Người dùng'
    : blockers.length > 0
      ? blockers.join("; ")
      : null;

  function confirmThenApprove() {
    modal.confirm({
      title: "Duyệt phiên kiểm kê?",
      width: 560,
      content: (
        <div className="flex flex-col gap-2">
          <Typography.Paragraph className="mb-0">
            Chấp nhận tồn 0 cho <strong>{acceptZeroProductIds.length}</strong> mã chưa đếm.
          </Typography.Paragraph>
          <Typography.Paragraph className="mb-0">
            Duyệt sẽ ghi sổ phiếu kiểm kê: tồn của từng mã về đúng số đã đếm (lệch tính theo tồn
            sổ lúc đếm). Phiếu không sửa được nữa.
          </Typography.Paragraph>
        </div>
      ),
      okText: "Duyệt",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await approve.mutateAsync(acceptZeroProductIds);
          message.success(`Đã duyệt phiên — tồn đã cập nhật`);
        } catch (error) {
          if (errorCode(error) === "42501") {
            message.error("Bạn chưa được bật quyền Duyệt kiểm kê. Liên hệ quản lý.");
            return;
          }
          if (errorCode(error) === "23514" && isPostgrestError(error)) {
            message.error({
              content: `${error.message}. Tải lại bảng rồi thử lại.`,
              duration: 8,
            });
            return;
          }
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      },
    });
  }

  return (
    <Tooltip title={disabledReason ?? ""}>
      <span>
        <Button
          type="primary"
          disabled={Boolean(disabledReason)}
          loading={approve.isPending}
          onClick={confirmThenApprove}
        >
          Duyệt phiên
        </Button>
      </span>
    </Tooltip>
  );
}
