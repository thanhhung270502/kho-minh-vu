"use client";

import { App, DatePicker, Input, Segmented, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { useLookups } from "@/features/products/hooks/useProducts";
import { StatusDot } from "@/shared/components/status-dot";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { filterByLabel } from "@/shared/lib/text";

import { useChangeReceiptSource, useUpdateReceiptHeader } from "../hooks/useReceipts";
import type { DocumentHeaderInput } from "../schemas/receipt.schema";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_TONES,
  RECEIPT_SOURCE_LABELS,
  type DocumentDetail,
  type ReceiptSource,
} from "../types";

type Props = { receipt: DocumentDetail; canEdit: boolean };

/**
 * Khung "Thông tin phiếu" bên phải, cùng khuôn với trang đơn đặt. Phiếu đã ghi sổ
 * hoặc đã hủy thì chỉ đọc — khóa thật nằm ở policy 0016.
 */
export function ReceiptAside({ receipt, canEdit }: Props) {
  const { message, modal } = App.useApp();
  const update = useUpdateReceiptHeader(receipt.id);
  const changeSource = useChangeReceiptSource(receipt.id);
  const lookups = useLookups();
  const suppliers = usePartners({ ...DEFAULT_PARTNER_FILTER, kind: "NCC" });
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const editable = receipt.status === "NHAP_LIEU" && canEdit;

  function reportError(error: unknown) {
    if (errorCode(error) === "42501") {
      message.error("Bạn không có quyền sửa phiếu này. Liên hệ quản trị hệ thống.");
      return;
    }
    // Lớp api ném Error thường khi RLS lọc im lặng — câu đó đã đủ rõ (bẫy 8).
    if (error instanceof Error && !isPostgrestError(error)) {
      message.error(error.message);
      return;
    }
    const explained = explainError(error);
    message.error(`${explained.title}. ${explained.action}`);
  }

  function markSaved(field: string) {
    setJustSaved(field);
    setTimeout(() => setJustSaved(null), 2000);
  }

  async function save(field: string, values: Partial<DocumentHeaderInput>) {
    try {
      await update.mutateAsync(values);
      markSaved(field);
    } catch (error) {
      reportError(error);
    }
  }

  function pickSource(source: ReceiptSource) {
    if (source === receipt.source) return;
    modal.confirm({
      title: `Đổi nguồn nhập sang “${RECEIPT_SOURCE_LABELS[source]}”?`,
      content: "Nguồn nhập quyết định dãy số phiếu — phiếu sẽ được cấp số mới, số hiện tại bỏ trống.",
      okText: "Đổi nguồn",
      cancelText: "Giữ nguyên",
      onOk: async () => {
        try {
          await changeSource.mutateAsync(source);
          markSaved("source");
        } catch (error) {
          reportError(error);
        }
      },
    });
  }

  function label(field: string, text: string) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-chu-phu">
        {text}
        {justSaved === field ? (
          <Typography.Text type="secondary" className="text-xs font-normal">
            đã lưu
          </Typography.Text>
        ) : null}
      </div>
    );
  }

  const metaLabel = "text-xs text-trung-tinh-350";
  const metaValue = "text-[13.5px] font-semibold";

  return (
    <aside className="flex flex-col gap-4 rounded-the border border-vien p-5">
      <h2 className="m-0 text-[15px] font-extrabold">Thông tin phiếu</h2>

      <div className="flex flex-col gap-1.5">
        {label("partnerId", "Nhà cung cấp")}
        {editable ? (
          <Select
            showSearch
            filterOption={filterByLabel}
            className="w-full"
            placeholder="Chọn nhà cung cấp"
            status={receipt.partnerId ? undefined : "warning"}
            value={receipt.partnerId ?? undefined}
            loading={suppliers.isPending}
            options={(suppliers.data?.rows ?? []).map((supplier) => ({
              value: supplier.id,
              label: `${supplier.code} — ${supplier.name}`,
            }))}
            onChange={(value: string) => void save("partnerId", { partnerId: value })}
          />
        ) : (
          <span className="text-[13.5px]">
            {`${receipt.partnerCode ?? ""} ${receipt.partnerName ?? "—"}`.trim()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {label("source", "Nguồn nhập")}
        {editable ? (
          <Segmented<ReceiptSource>
            block
            value={receipt.source ?? "NCC"}
            disabled={changeSource.isPending}
            options={(["NCC", "NHA_MAY"] as const).map((s) => ({ value: s, label: RECEIPT_SOURCE_LABELS[s] }))}
            onChange={pickSource}
          />
        ) : (
          <span className="text-[13.5px]">{receipt.source ? RECEIPT_SOURCE_LABELS[receipt.source] : "—"}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          {label("warehouseId", "Kho mặc định")}
          {editable ? (
            <Select
              className="w-full"
              value={receipt.warehouseId ?? undefined}
              options={(lookups.data?.warehouses ?? []).map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              onChange={(value: string) => void save("warehouseId", { warehouseId: value })}
            />
          ) : (
            <span className="text-[13.5px]">{receipt.warehouseName ?? "—"}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {label("docDate", "Ngày phiếu")}
          {editable ? (
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              allowClear={false}
              value={dayjs(receipt.docDate)}
              onChange={(value) =>
                value ? void save("docDate", { docDate: value.format("YYYY-MM-DD") }) : null
              }
            />
          ) : (
            <span className="text-[13.5px]">{dayjs(receipt.docDate).format("DD/MM/YYYY")}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {label("note", "Ghi chú")}
        {editable ? (
          <Input.TextArea
            defaultValue={receipt.note ?? ""}
            placeholder="Ghi chú cho phiếu này"
            autoSize={{ minRows: 2, maxRows: 5 }}
            onBlur={(event) => void save("note", { note: event.target.value || null })}
          />
        ) : (
          <span className="text-[13.5px]">{receipt.note ?? "—"}</span>
        )}
      </div>

      <hr className="m-0 border-vien" />

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className={metaLabel}>Số phiếu</dt>
          <dd className={`m-0 font-mono ${metaValue}`}>{receipt.docNo}</dd>
        </div>
        <div>
          <dt className={metaLabel}>Người tạo</dt>
          <dd className={`m-0 ${metaValue}`}>{receipt.createdByName ?? "—"}</dd>
        </div>
        <div>
          <dt className={metaLabel}>Trạng thái</dt>
          <dd className={`m-0 ${metaValue}`}>
            <StatusDot tone={DOC_STATUS_TONES[receipt.status]} strike={receipt.status === "DA_HUY"}>
              {DOC_STATUS_LABELS[receipt.status]}
            </StatusDot>
          </dd>
        </div>
        <div>
          <dt className={metaLabel}>Ghi sổ lúc</dt>
          <dd className={`m-0 ${metaValue}`}>
            {receipt.postedAt ? dayjs(receipt.postedAt).format("HH:mm DD/MM/YYYY") : "—"}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
