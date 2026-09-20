"use client";

import { Alert, App, Button, Input, Radio, Space, Typography } from "antd";
import { useState } from "react";

import { errorCode, explainError } from "@/shared/lib/errors";

import { useClearNegativeReason, useSaveNegativeReason } from "../hooks/useIssues";
import {
  NEGATIVE_REASONS,
  NEGATIVE_REASON_LABELS,
  negativeReasonLabel,
  type NegativeReasonCode,
} from "../lib/negative-reasons";
import { negativeReasonSchema } from "../schemas/issue.schema";
import { exceedsStock, type IssueLine } from "../types";
import { SimilarCodeHint } from "./similar-code-hint";

function formatNumber(value: number): string {
  return Number(value).toLocaleString("vi-VN");
}

/** Chỉ coi là đã chọn một trong bốn mã cố định — chuỗi tự do cũ (nếu có) không lên Radio.Group. */
function toCanonicalCode(code: string | null | undefined): NegativeReasonCode | null {
  return code && (NEGATIVE_REASONS as readonly string[]).includes(code)
    ? (code as NegativeReasonCode)
    : null;
}

export const NEGATIVE_PANEL_DOM_ID = "khu-vuc-ly-do-xuat-am";

type SavedReason = { code: string; note: string | null } | null;

type Props = {
  issueId: string;
  lines: IssueLine[];
  reason: SavedReason;
  editable: boolean;
};

/**
 * D-12 lớp 2 + D-11: chỉ hiện khi có dòng vượt tồn — không mời chọn lý do lúc
 * không cần. Lưu ngay khi đổi lựa chọn/rời ô ghi chú, không đợi lúc ghi sổ,
 * để đóng tab quay lại vẫn còn lý do đã chọn. Chốt chặn THẬT nằm ở hàm ghi sổ
 * ở tầng database — khối này chỉ thu thập lý do và nói trước hậu quả.
 */
export function NegativeStockPanel({ issueId, lines, reason, editable }: Props) {
  const { message } = App.useApp();
  const save = useSaveNegativeReason(issueId);
  const clear = useClearNegativeReason(issueId);

  const overLines = lines.filter(exceedsStock);

  // Khởi tạo một lần từ dữ liệu đã tải — component chỉ mount sau khi phiếu đã
  // tải xong (QueryState), nên không cần đồng bộ lại bằng effect. "Bỏ chọn lý
  // do" và lưu thành công đều tự cập nhật state này tại chỗ, không đợi refetch.
  const [code, setCode] = useState<NegativeReasonCode | null>(() =>
    toCanonicalCode(reason?.code),
  );
  const [note, setNote] = useState(() => reason?.note ?? "");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  if (overLines.length === 0) return null;

  async function persist(nextCode: NegativeReasonCode, nextNote: string) {
    const parsed = negativeReasonSchema.safeParse({
      code: nextCode,
      note: nextNote || null,
    });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? "Ghi chú không hợp lệ");
      return;
    }
    setNoteError(null);
    try {
      await save.mutateAsync(parsed.data);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      if (errorCode(error) === "42501") {
        message.error("Bạn không có quyền sửa phiếu này.");
        return;
      }
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function clearReason() {
    try {
      await clear.mutateAsync();
      setCode(null);
      setNote("");
      setNoteError(null);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <div
      id={NEGATIVE_PANEL_DOM_ID}
      className="mb-4 flex flex-col gap-3 rounded border border-orange-200 bg-orange-50 p-3"
    >
      <Alert
        type="warning"
        showIcon
        title={`${overLines.length} dòng sẽ làm tồn âm nếu ghi sổ`}
        description={
          <ul className="mb-0 ps-4">
            {overLines.map((line) => (
              <li key={line.id}>
                {line.productCode} — {line.warehouseName ?? "—"} — tồn{" "}
                {formatNumber(line.currentStock)} — xuất {formatNumber(line.quantity)}
              </li>
            ))}
          </ul>
        }
      />

      {editable ? (
        <>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            value={code}
            onChange={(event) => {
              const next = event.target.value as NegativeReasonCode;
              setCode(next);
              void persist(next, note);
            }}
          >
            {NEGATIVE_REASONS.map((option) => (
              <Radio.Button key={option} value={option}>
                {NEGATIVE_REASON_LABELS[option]}
              </Radio.Button>
            ))}
          </Radio.Group>

          <Input.TextArea
            rows={2}
            value={note}
            placeholder="Ghi chú (bắt buộc khi chọn Khác)"
            status={noteError ? "error" : undefined}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => {
              if (code) void persist(code, note);
            }}
          />
          {noteError ? (
            <Typography.Text type="danger" className="text-xs">
              {noteError}
            </Typography.Text>
          ) : null}

          <Space>
            {justSaved ? (
              <Typography.Text type="secondary" className="text-xs">
                đã lưu
              </Typography.Text>
            ) : null}
            {code ? (
              <Button size="small" loading={clear.isPending} onClick={() => void clearReason()}>
                Bỏ chọn lý do
              </Button>
            ) : null}
          </Space>
        </>
      ) : (
        <Typography.Text>
          Lý do đã chọn: {negativeReasonLabel(reason?.code ?? null) ?? "Chưa chọn"}
          {reason?.note ? ` — ${reason.note}` : ""}
        </Typography.Text>
      )}

      {overLines.map((line) => (
        <SimilarCodeHint key={line.id} issueId={issueId} line={line} />
      ))}
    </div>
  );
}
