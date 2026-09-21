"use client";

import { Alert, App, Button, Input, Radio, Space, Typography } from "antd";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";

import { errorCode, explainError } from "@/shared/lib/errors";

import { useClearNegativeReason, useSaveNegativeReason } from "../hooks/useDocuments";
import {
  NEGATIVE_REASONS,
  NEGATIVE_REASON_LABELS,
  negativeReasonLabel,
  type NegativeReasonCode,
} from "../lib/negative-reasons";
import { negativeReasonSchema } from "../schemas/document.schema";
import { exceedsStock, type DocumentLine } from "../types";

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
  documentId: string;
  lines: DocumentLine[];
  reason: SavedReason;
  editable: boolean;
  /**
   * Khe cắm mở rộng theo TỪNG dòng vượt tồn — `stock-out` dùng để hiện gợi ý
   * mã gần giống + nút đề nghị gộp (D-14, `SimilarCodeHint`); `returns`
   * (TRA_NCC) không cần, để trống.
   */
  renderLineExtra?: (line: DocumentLine) => ReactNode;
};

/**
 * D-12 lớp 2 + D-11: chỉ hiện khi có dòng vượt tồn — không mời chọn lý do lúc
 * không cần. Lưu ngay khi đổi lựa chọn/rời ô ghi chú, không đợi lúc ghi sổ,
 * để đóng tab quay lại vẫn còn lý do đã chọn. Chốt chặn THẬT nằm ở hàm ghi sổ
 * ở tầng database — khối này chỉ thu thập lý do và nói trước hậu quả.
 *
 * Nâng lên từ `features/stock-out` — `features/returns` (plan 04-14) dùng
 * lại cho `TRA_NCC` (loại trả duy nhất có thể làm tồn âm). Caller tự quyết
 * có hiện panel này hay không (`TRA_KHACH` không bao giờ hiện).
 */
export function NegativeStockPanel({
  documentId,
  lines,
  reason,
  editable,
  renderLineExtra,
}: Props) {
  const { message } = App.useApp();
  const save = useSaveNegativeReason(documentId);
  const clear = useClearNegativeReason(documentId);

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
      // Lựa chọn trên màn không lưu được thì lý do CŨ trên phiếu phải bỏ đi.
      // Nút Ghi sổ đọc lý do ĐÃ LƯU; để lý do cũ sống tiếp thì người dùng thấy
      // "Khác" đang chọn, bấm Ghi sổ, và sổ ghi lý do trước đó. Xóa đi để nút
      // tự khóa cho tới khi lựa chọn mới hợp lệ. Đo tận tay ở UAT Phase 4.
      if (reason?.code) {
        try {
          await clear.mutateAsync();
        } catch (error) {
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      }
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
                {formatNumber(line.currentStock)} — số ghi sổ {formatNumber(line.quantity)}
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

      {renderLineExtra
        ? overLines.map((line) => <Fragment key={line.id}>{renderLineExtra(line)}</Fragment>)
        : null}
    </div>
  );
}
