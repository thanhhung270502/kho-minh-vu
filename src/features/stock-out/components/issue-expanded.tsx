"use client";

import { Button, Skeleton } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { VoidDocumentDialog } from "@/features/documents/components/void-document-dialog";
import { ReturnButton } from "@/features/returns/components/return-button";
import { orderKeys } from "@/features/sales-order/api/order.keys";
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
import { formatOrderRecipients } from "@/shared/lib/recipient";

import { useIssueDetail, useIssueLines, useUpdateIssueHeader } from "../hooks/useIssues";
import { DOC_STATUS_LABELS, DOC_STATUS_TONES, issueRecipients, type IssueLine, type IssuePermissions } from "../types";

const ORDER_KEYS = [orderKeys.all];

type Props = { id: string; permissions: IssuePermissions };

/**
 * Bấm một dòng của danh sách Duyệt đơn: xem nhanh hóa đơn ngay trong bảng — thông tin,
 * dòng hàng, ghi chú và các thao tác (hủy, mở phiếu, trả hàng, in phiếu). Ghi sổ và sửa
 * dòng thì "Mở phiếu" — ở đó mới có cảnh báo xuất âm và chọn lý do.
 */
export function IssueExpanded({ id, permissions }: Props) {
  const detail = useIssueDetail(id);
  const lines = useIssueLines(id);
  const update = useUpdateIssueHeader(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(issue) => issue === null}
      emptyDescription="Không tìm thấy phiếu này."
      skeleton={<Skeleton active paragraph={{ rows: 4 }} />}
    >
      {(issue) => {
        if (!issue) return null;
        const editable = issue.status === "NHAP_LIEU" && permissions.canEdit;
        const recipients = formatOrderRecipients(issueRecipients(issue));
        // Hóa đơn nạp từ KiotViet ghi "Người bán: X" — đó là người duyệt đơn. Hóa đơn hệ mới
        // lấy người xác nhận đơn gốc (0115); đơn xác nhận trước 0115 không lưu người duyệt
        // nên lùi về người ghi sổ (người bấm Hoàn thành đơn).
        const note = splitNoteSegment(issue.note, "Người bán");
        const all = lines.data ?? [];

        return (
          <QuickViewFrame>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold">{issue.docNo}</span>
              <StatusDot tone={DOC_STATUS_TONES[issue.status]} variant="badge" strike={issue.status === "DA_HUY"}>
                {DOC_STATUS_LABELS[issue.status]}
              </StatusDot>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Field label="Người tạo">{issue.createdByName ?? "—"}</Field>
              <Field label="Người duyệt đơn">{note.value ?? issue.orderApprovedByName ?? issue.approvedByName ?? "—"}</Field>
              <Field label="Đơn gốc">
                {issue.orderId ? (
                  <Link href={`/don-dat/${issue.orderId}`} className="font-mono">
                    {issue.orderNo}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Ngày">{dayjs(issue.docDate).format("DD/MM/YYYY")}</Field>
              <Field label="Ghi sổ lúc">
                {issue.postedAt ? dayjs(issue.postedAt).format("HH:mm DD/MM/YYYY") : "—"}
              </Field>
            </div>

            <QueryState query={lines} isEmpty={() => false} emptyDescription="">
              {(all) => (
                <QuickViewLineTable<IssueLine>
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
              onSave={(text) => update.mutateAsync({ note: joinNoteSegment(text, note.segment) })}
              summary={[
                { label: "Số dòng", value: formatQuantity(all.length) },
                { label: "Tổng số lượng", value: formatQuantity(all.reduce((s, l) => s + Number(l.quantity), 0)) },
                { label: "Người nhận", value: recipients === "—" ? "Chưa chọn" : recipients },
              ]}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-vien pt-3">
              <div>
                <VoidDocumentDialog document={issue} canVoid={permissions.canVoid} extraInvalidateKeys={ORDER_KEYS} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/duyet-don/${id}`}>
                  <Button type="primary">Mở phiếu</Button>
                </Link>
                <ReturnButton document={issue} canEdit={permissions.canEdit} />
                <Link href={`/duyet-don/${id}/in`} target="_blank">
                  <Button>In phiếu</Button>
                </Link>
              </div>
            </div>
          </QuickViewFrame>
        );
      }}
    </QueryState>
  );
}
