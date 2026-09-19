"use client";

import { App, DatePicker, Descriptions, Input, Select, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { useLookups } from "@/features/products/hooks/useProducts";
import { explainError } from "@/shared/lib/errors";

import { useUpdateReceiptHeader } from "../hooks/useReceipts";
import type { DocumentHeaderInput } from "../schemas/receipt.schema";
import {
  DOC_STATUS_COLORS,
  DOC_STATUS_LABELS,
  RECEIPT_SOURCE_COLORS,
  RECEIPT_SOURCE_LABELS,
  type DocumentDetail,
} from "../types";

type Props = { receipt: DocumentDetail; canEdit: boolean };

/** Phiếu đã ghi sổ hoặc đã hủy thì chỉ đọc — khóa thật nằm ở policy 0016. */
export function ReceiptHeader({ receipt, canEdit }: Props) {
  const { message } = App.useApp();
  const update = useUpdateReceiptHeader(receipt.id);
  const lookups = useLookups();
  const suppliers = usePartners({ ...DEFAULT_PARTNER_FILTER, kind: "NCC" });
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const editable = receipt.status === "NHAP_LIEU" && canEdit;

  async function save(field: string, values: Partial<DocumentHeaderInput>) {
    try {
      await update.mutateAsync(values);
      setJustSaved(field);
      setTimeout(() => setJustSaved(null), 2000);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  function fieldLabel(field: string, text: string) {
    return (
      <span className="flex items-center gap-2">
        {text}
        {justSaved === field ? (
          <Typography.Text type="secondary" className="text-xs">
            đã lưu
          </Typography.Text>
        ) : null}
      </span>
    );
  }

  return (
    <Descriptions
      bordered
      size="small"
      column={{ xs: 1, sm: 2, lg: 3 }}
      items={[
        {
          key: "status",
          label: "Trạng thái",
          children: (
            <span className="flex flex-wrap items-center gap-2">
              <Tag color={DOC_STATUS_COLORS[receipt.status]}>
                {DOC_STATUS_LABELS[receipt.status]}
              </Tag>
              {receipt.postedAt ? (
                <Typography.Text type="secondary" className="text-xs">
                  ghi sổ {dayjs(receipt.postedAt).format("HH:mm DD/MM/YYYY")}
                </Typography.Text>
              ) : null}
            </span>
          ),
        },
        {
          key: "source",
          label: "Nguồn nhập",
          children: receipt.source ? (
            <Tag color={RECEIPT_SOURCE_COLORS[receipt.source]}>
              {RECEIPT_SOURCE_LABELS[receipt.source]}
            </Tag>
          ) : (
            "—"
          ),
        },
        {
          key: "docDate",
          label: fieldLabel("docDate", "Ngày phiếu"),
          children: editable ? (
            <DatePicker
              format="DD/MM/YYYY"
              allowClear={false}
              value={dayjs(receipt.docDate)}
              onChange={(value) =>
                value
                  ? void save("docDate", { docDate: value.format("YYYY-MM-DD") })
                  : null
              }
            />
          ) : (
            dayjs(receipt.docDate).format("DD/MM/YYYY")
          ),
        },
        {
          key: "partner",
          label: fieldLabel("partnerId", "Nhà cung cấp"),
          children: editable ? (
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full min-w-48"
              value={receipt.partnerId}
              loading={suppliers.isPending}
              options={(suppliers.data?.rows ?? []).map((supplier) => ({
                value: supplier.id,
                label: `${supplier.code} — ${supplier.name}`,
              }))}
              onChange={(value) => void save("partnerId", { partnerId: value })}
            />
          ) : (
            `${receipt.partnerCode ?? ""} ${receipt.partnerName ?? "—"}`.trim()
          ),
        },
        {
          key: "warehouse",
          label: fieldLabel("warehouseId", "Kho mặc định"),
          children: editable ? (
            <Select
              className="w-full min-w-40"
              value={receipt.warehouseId}
              options={(lookups.data?.warehouses ?? []).map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              onChange={(value) => void save("warehouseId", { warehouseId: value })}
            />
          ) : (
            (receipt.warehouseName ?? "—")
          ),
        },
        {
          key: "createdBy",
          label: "Người tạo",
          children: receipt.createdByName ?? "—",
        },
        {
          key: "note",
          label: fieldLabel("note", "Ghi chú"),
          children: editable ? (
            <Input
              defaultValue={receipt.note ?? ""}
              placeholder="Ghi chú cho phiếu này"
              onBlur={(event) =>
                void save("note", { note: event.target.value || null })
              }
            />
          ) : (
            (receipt.note ?? "—")
          ),
        },
      ]}
    />
  );
}
