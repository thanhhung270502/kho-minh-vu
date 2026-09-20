"use client";

import { Alert, App, Button, Input, Modal } from "antd";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useVoidIssue } from "../hooks/useIssues";
import type { IssueDetail } from "../types";

type Props = { issue: IssueDetail; canVoid: boolean };

/**
 * Chỉ quản lý hủy được phiếu xuất đã ghi sổ (D-06) — hàm hủy ở tầng database
 * chặn mọi vai trò khác. Hủy sinh bút toán đảo, không xóa gì; tồn quay lại
 * nhưng giá vốn KHÔNG quay lại (hành vi đã chốt từ Phase 3). Tự chứa cả nút
 * bấm lẫn hộp thoại — chỉ hiện khi phiếu đã ghi sổ và tài khoản có quyền.
 */
export function VoidIssueDialog({ issue, canVoid }: Props) {
  const { message } = App.useApp();
  const voidIssue = useVoidIssue(issue.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (issue.status !== "HOAN_THANH" || !canVoid) return null;

  function close() {
    if (voidIssue.isPending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  async function run() {
    if (reason.trim().length < 5) {
      setError("Nhập lý do hủy, ít nhất 5 ký tự — lý do sẽ lưu vào phiếu.");
      return;
    }
    try {
      await voidIssue.mutateAsync(reason.trim());
      message.success(`Đã hủy phiếu ${issue.docNo}`);
      close();
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Chỉ quản lý hủy được phiếu xuất đã ghi sổ.");
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
        title={`Hủy phiếu ${issue.docNo}?`}
        okText="Hủy phiếu"
        okButtonProps={{ danger: true }}
        cancelText="Thôi"
        confirmLoading={voidIssue.isPending}
        mask={{ closable: false }}
        onOk={() => void run()}
        onCancel={close}
      >
        {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Ba điều xảy ra khi hủy phiếu đã ghi sổ"
          description={
            <ul className="mb-0 ps-4">
              <li>Tồn quay lại bằng bút toán đảo — bản ghi gốc giữ nguyên, không xóa gì.</li>
              <li>
                <strong>Giá vốn KHÔNG quay lại</strong> — bình quân gia quyền là trung bình lịch
                sử, không hoàn tác được.
              </li>
              <li>Tiến độ đơn gắn với phiếu này (nếu có) sẽ tính lại theo số đã xuất còn lại.</li>
            </ul>
          }
        />

        <Input.TextArea
          autoFocus
          rows={3}
          value={reason}
          placeholder="Lý do hủy (lưu vào phiếu)"
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
