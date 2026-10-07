"use client";

import { Button, Skeleton } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";

import { ReturnButton } from "@/features/returns/components/return-button";
import { QueryState } from "@/shared/components/query-state";
import {
  QuickViewField as Field,
  QuickViewFrame,
  QuickViewLineTable,
  QuickViewNote,
  formatQuantity,
} from "@/shared/components/quick-view";
import { StatusDot } from "@/shared/components/status-dot";
import { joinNoteSegment, splitNoteSegment } from "@/shared/lib/note-segment";

import { useReceiptDetail, useReceiptLines, useUpdateReceiptHeader } from "../hooks/useReceipts";
import { DOC_STATUS_LABELS, DOC_STATUS_TONES, type DocumentLine, type ReceiptPermissions } from "../types";
import { VoidReceiptDialog } from "./void-receipt-dialog";

type Props = { id: string; permissions: ReceiptPermissions };

/**
 * Bấm vào một dòng của danh sách Phiếu nhập: xem nhanh phiếu ngay trong bảng — thông
 * tin, dòng hàng (một ô tìm theo mã hoặc tên), ghi chú, và các thao tác (hủy, mở phiếu, trả
 * hàng NCC, in phiếu). Sửa dòng hàng thì "Mở phiếu".
 */
export function ReceiptExpanded({ id, permissions }: Props) {
  const detail = useReceiptDetail(id);
  const lines = useReceiptLines(id);
  const update = useUpdateReceiptHeader(id);
  const [voidOpen, setVoidOpen] = useState(false);

  return (
    <QueryState
      query={detail}
      isEmpty={(r) => r === null}
      emptyDescription="Không tìm thấy phiếu này."
      skeleton={<Skeleton active paragraph={{ rows: 4 }} />}
    >
      {(receipt) => {
        if (!receipt) return null;
        const editable = receipt.status === "NHAP_LIEU" && permissions.canEdit;
        // Phiếu nạp từ KiotViet ghi "Người nhập: X" trong ghi chú; phiếu tạo trên hệ mới
        // thì người nhập là người ghi sổ.
        const note = splitNoteSegment(receipt.note, "Người nhập");
        const all = lines.data ?? [];

        return (
          <QuickViewFrame>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold">{receipt.docNo}</span>
              <StatusDot tone={DOC_STATUS_TONES[receipt.status]} variant="badge" strike={receipt.status === "DA_HUY"}>
                {DOC_STATUS_LABELS[receipt.status]}
              </StatusDot>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Field label="Người tạo">{receipt.createdByName ?? "—"}</Field>
              <Field label="Người nhập">{note.value ?? receipt.approvedByName ?? "—"}</Field>
              <Field label="Nhà cung cấp">{receipt.partnerName ?? "Chưa chọn"}</Field>
              <Field label="Ngày nhập">{dayjs(receipt.docDate).format("DD/MM/YYYY")}</Field>
              <Field label="Ghi sổ lúc">
                {receipt.postedAt ? dayjs(receipt.postedAt).format("HH:mm DD/MM/YYYY") : "—"}
              </Field>
            </div>

            <QueryState query={lines} isEmpty={() => false} emptyDescription="">
              {(all) => (
                <QuickViewLineTable<DocumentLine>
                  lines={all}
                  quantityColumns={[
                    { title: "Số lượng", dataIndex: "quantity", width: 110, align: "right", render: formatQuantity },
                  ]}
                />
              )}
            </QueryState>

            <QuickViewNote
              value={note.rest}
              editable={editable}
              // Giữ lại phần "Người nhập: X" đã tách ra khỏi ô.
              onSave={(text) => update.mutateAsync({ note: joinNoteSegment(text, note.segment) })}
              summary={[
                { label: "Số dòng", value: formatQuantity(all.length) },
                { label: "Tổng số lượng", value: formatQuantity(all.reduce((s, l) => s + Number(l.quantity), 0)) },
              ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-vien pt-3">
              <div>
                {receipt.status !== "DA_HUY" && (editable || (receipt.status === "HOAN_THANH" && permissions.canVoid)) ? (
                  <Button danger onClick={() => setVoidOpen(true)}>
                    Hủy phiếu
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/nhap-kho/${id}`}>
                  <Button type="primary">Mở phiếu</Button>
                </Link>
                <ReturnButton document={receipt} canEdit={permissions.canEdit} />
                <Link href={`/nhap-kho/${id}/in`} target="_blank">
                  <Button>In phiếu</Button>
                </Link>
              </div>
            </div>

            <VoidReceiptDialog receipt={receipt} open={voidOpen} onClose={() => setVoidOpen(false)} />
          </QuickViewFrame>
        );
      }}
    </QueryState>
  );
}
