"use client";

import { App, Descriptions, Input, Select, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useUpdateIssueHeader } from "../hooks/useIssues";
import type { DocumentHeaderInput } from "../schemas/issue.schema";
import { DOC_STATUS_COLORS, DOC_STATUS_LABELS, type IssueDetail } from "../types";

type Props = { issue: IssueDetail; canEdit: boolean };

/**
 * Đầu phiếu xuất sửa tại chỗ. Không có mục cho biết nhập từ nhà cung cấp hay
 * nhà máy (chỉ chiều nhập mới cần phân biệt) và không có mục thu thập lý do
 * xuất âm ở đây — lý do đó thu thập ở khối cảnh báo ngay trước khi ghi sổ
 * (plan 04-13), đặt ở đầu phiếu sẽ mời chọn sẵn rồi quên.
 * Phiếu đã ghi sổ hoặc đã hủy thì chỉ đọc — khóa thật nằm ở policy 0016.
 */
export function IssueHeader({ issue, canEdit }: Props) {
  const { message } = App.useApp();
  const update = useUpdateIssueHeader(issue.id);
  const lookups = useLookups();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const editable = issue.status === "NHAP_LIEU" && canEdit;

  async function save(field: string, values: Partial<DocumentHeaderInput>) {
    try {
      await update.mutateAsync(values);
      setJustSaved(field);
      setTimeout(() => setJustSaved(null), 2000);
    } catch (error) {
      if (errorCode(error) === "42501") {
        message.error("Bạn không có quyền sửa phiếu này. Liên hệ quản trị hệ thống.");
        return;
      }
      // Lớp api ném Error thường (không phải PostgrestError) khi RLS lọc im
      // lặng — count trả về rỗng. Hiện nguyên văn câu đó (bẫy 8).
      if (error instanceof Error && !isPostgrestError(error)) {
        message.error(error.message);
        return;
      }
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
          key: "docNo",
          label: "Số phiếu",
          children: <span className="font-mono">{issue.docNo}</span>,
        },
        {
          key: "docDate",
          label: "Ngày phiếu",
          children: dayjs(issue.docDate).format("DD/MM/YYYY"),
        },
        {
          key: "status",
          label: "Trạng thái",
          children: <Tag color={DOC_STATUS_COLORS[issue.status]}>{DOC_STATUS_LABELS[issue.status]}</Tag>,
        },
        {
          key: "createdBy",
          label: "Người tạo",
          children: issue.createdByName ?? "—",
        },
        {
          key: "postedAt",
          label: "Ngày ghi sổ",
          children: issue.postedAt
            ? dayjs(issue.postedAt).format("HH:mm DD/MM/YYYY")
            : "—",
        },
        {
          key: "partner",
          label: fieldLabel("partnerId", "Người nhận"),
          children: editable ? (
            <PartnerSearchInput
              value={issue.partnerId ?? undefined}
              onChange={(value) =>
                value ? void save("partnerId", { partnerId: value }) : null
              }
            />
          ) : (
            `${issue.partnerCode ?? ""} ${issue.partnerName ?? "—"}`.trim()
          ),
        },
        {
          key: "warehouse",
          label: fieldLabel("warehouseId", "Kho đầu phiếu"),
          children: editable ? (
            <div className="flex flex-col gap-1">
              <Select
                className="w-full min-w-40"
                value={issue.warehouseId}
                options={(lookups.data?.warehouses ?? []).map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                }))}
                onChange={(value) => void save("warehouseId", { warehouseId: value })}
              />
              <Typography.Text type="secondary" className="text-xs">
                Dòng nào chọn kho riêng thì theo kho đó.
              </Typography.Text>
            </div>
          ) : (
            (issue.warehouseName ?? "—")
          ),
        },
        {
          key: "order",
          label: "Đơn gốc",
          children: issue.orderId ? (
            <Link href={`/dat-hang/${issue.orderId}`}>{issue.orderNo}</Link>
          ) : (
            "Không gắn đơn"
          ),
        },
        {
          key: "note",
          label: fieldLabel("note", "Ghi chú"),
          children: editable ? (
            <Input.TextArea
              defaultValue={issue.note ?? ""}
              placeholder="Ghi chú cho phiếu này"
              autoSize={{ minRows: 1, maxRows: 3 }}
              onBlur={(event) =>
                void save("note", { note: event.target.value || null })
              }
            />
          ) : (
            (issue.note ?? "—")
          ),
        },
      ]}
    />
  );
}
