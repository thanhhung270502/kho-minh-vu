"use client";

import { Alert, Button } from "antd";

import { explainError } from "@/shared/lib/errors";

type Props = { error: unknown; retrying: boolean; onRetry: () => void; className?: string };

/** Không tải được bộ mã hóa — nói rõ hậu quả (ô quy chuẩn trống) và cho thử lại. */
export function CodeDictionaryError({ error, retrying, onRetry, className }: Props) {
  const explained = explainError(error);
  return (
    <Alert
      className={className}
      type="error"
      showIcon
      title={`Không tải được bộ mã hóa — ${explained.title}`}
      description={`Các ô Hãng xe / Dòng xe / Linh kiện chưa có lựa chọn và chưa tự điền theo mã. ${explained.action}`}
      action={
        <Button size="small" loading={retrying} onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  );
}
