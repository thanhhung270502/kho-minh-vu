"use client";

import { App, Button, Input, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ReturnButton } from "@/features/returns/components/return-button";
import { QueryState } from "@/shared/components/query-state";
import { StatusDot } from "@/shared/components/status-dot";
import { explainError } from "@/shared/lib/errors";
import { labelMatches } from "@/shared/lib/text";

import { useReceiptDetail, useReceiptLines, useUpdateReceiptHeader } from "../hooks/useReceipts";
import { DOC_STATUS_LABELS, DOC_STATUS_TONES, type DocumentLine, type ReceiptPermissions } from "../types";
import { VoidReceiptDialog } from "./void-receipt-dialog";

const qty = (v: number) => Number(v).toLocaleString("vi-VN");

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-chu-phu">{label}</div>
      <div className="truncate text-[13.5px] font-semibold">{children}</div>
    </div>
  );
}

type Props = { id: string; permissions: ReceiptPermissions };

/**
 * Bấm vào một dòng của danh sách Phiếu nhập: xem nhanh phiếu ngay trong bảng — thông
 * tin, dòng hàng (tìm theo mã / tên), ghi chú, và các thao tác (hủy, mở phiếu, trả
 * hàng NCC, in phiếu). Sửa dòng hàng thì "Mở phiếu".
 */
export function ReceiptExpanded({ id, permissions }: Props) {
  const { message } = App.useApp();
  const detail = useReceiptDetail(id);
  const lines = useReceiptLines(id);
  const update = useUpdateReceiptHeader(id);
  const [codeQuery, setCodeQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
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
        const all = lines.data ?? [];
        const visible = all.filter(
          (l) =>
            (!codeQuery.trim() || labelMatches(codeQuery, l.productCode)) &&
            (!nameQuery.trim() || labelMatches(nameQuery, l.productName)),
        );
        const totalQuantity = all.reduce((s, l) => s + Number(l.quantity), 0);

        const columns: TableColumnsType<DocumentLine> = [
          {
            title: (
              <Input size="small" allowClear placeholder="Tìm mã hàng" value={codeQuery} onChange={(e) => setCodeQuery(e.target.value)} />
            ),
            dataIndex: "productCode",
            width: 220,
            render: (code: string, l) => (
              <Link href={`/danh-muc?chon=${l.productId}`} className="font-mono">
                {code}
              </Link>
            ),
          },
          {
            title: (
              <Input size="small" allowClear placeholder="Tìm tên hàng" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} />
            ),
            dataIndex: "productName",
            ellipsis: true,
            render: (name: string, l) => `${name}${l.unitName ? ` (${l.unitName})` : ""}`,
          },
          { title: "Số lượng", dataIndex: "quantity", width: 110, align: "right", render: (v: number) => qty(v) },
        ];

        return (
          // Bấm trong khung mở rộng không được gập dòng lại.
          <div data-no-row-click className="flex cursor-default flex-col gap-4 px-2 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold">{receipt.docNo}</span>
              <StatusDot tone={DOC_STATUS_TONES[receipt.status]} variant="badge" strike={receipt.status === "DA_HUY"}>
                {DOC_STATUS_LABELS[receipt.status]}
              </StatusDot>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Người tạo">{receipt.createdByName ?? "—"}</Field>
              <Field label="Nhà cung cấp">{receipt.partnerName ?? "Chưa chọn"}</Field>
              <Field label="Ngày nhập">{dayjs(receipt.docDate).format("DD/MM/YYYY")}</Field>
              <Field label="Ghi sổ lúc">
                {receipt.postedAt ? dayjs(receipt.postedAt).format("HH:mm DD/MM/YYYY") : "—"}
              </Field>
            </div>

            <QueryState query={lines} isEmpty={() => false} emptyDescription="">
              {() => (
                <Table<DocumentLine>
                  rowKey="id"
                  size="small"
                  columns={columns}
                  dataSource={visible}
                  scroll={{ x: 560 }}
                  pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
                  locale={{ emptyText: all.length === 0 ? "Phiếu chưa có dòng nào." : "Không có dòng nào khớp ô tìm." }}
                />
              )}
            </QueryState>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <Input.TextArea
                key={receipt.note ?? ""}
                className="max-w-2xl"
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder={editable ? "Ghi chú…" : "Không có ghi chú"}
                defaultValue={receipt.note ?? ""}
                readOnly={!editable}
                onBlur={async (event) => {
                  if (!editable || (event.target.value || null) === (receipt.note ?? null)) return;
                  try {
                    await update.mutateAsync({ note: event.target.value || null });
                    message.success("Đã lưu ghi chú");
                  } catch (error) {
                    const explained = explainError(error);
                    message.error(`${explained.title}. ${explained.action}`);
                  }
                }}
              />
              <dl className="m-0 grid min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[13.5px]">
                <dt className="text-chu-phu">Số lượng mặt hàng</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{qty(all.length)}</dd>
                <dt className="text-chu-phu">Tổng số lượng</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{qty(totalQuantity)}</dd>
              </dl>
            </div>

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
          </div>
        );
      }}
    </QueryState>
  );
}
