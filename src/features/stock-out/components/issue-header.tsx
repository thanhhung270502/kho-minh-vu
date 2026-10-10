"use client";

import { App, Descriptions, Input, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";

import { StatusDot } from "@/shared/components/status-dot";
import { InternalPartnerSelect } from "@/shared/components/internal-partner-select";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useUpdateIssueHeader } from "../hooks/useIssues";
import type { DocumentHeaderInput } from "../schemas/issue.schema";
import {
  DOC_STATUS_TONES,
  DOC_STATUS_LABELS,
  type IssueDetail,
} from "../types";
type Props = { issue: IssueDetail; canEdit: boolean };

/**
 * Đầu phiếu xuất sửa tại chỗ. Lý do xuất âm thu ở khối cảnh báo trước khi ghi
 * sổ (plan 04-13), không đặt ở đây. Phiếu đã ghi sổ/hủy chỉ đọc — khóa thật
 * nằm ở policy 0016.
 */
export function IssueHeader({ issue, canEdit }: Props) {
  const { message } = App.useApp();
  const update = useUpdateIssueHeader(issue.id);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const editable = issue.status === "NHAP_LIEU" && canEdit;

  async function save(field: string, values: Partial<DocumentHeaderInput>) {
    try {
      await update.mutateAsync(values);
      setJustSaved(field);
      setTimeout(() => setJustSaved(null), 2000);
    } catch (error) {
      if (errorCode(error) === "42501") {
        message.error(
          "Bạn không có quyền sửa phiếu này. Liên hệ quản trị hệ thống.",
        );
        return;
      }
      // RLS lọc im lặng thì api ném Error thường — hiện nguyên văn (bẫy 8).
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

  // Như đơn đặt (08/10/2026): người nhận chỉ là đối tác mã NB…, tên người nhận thật
  // gõ ở Ghi chú; nhân viên phụ trách không hiện nữa.
  const recipientItems = [
    {
      key: "partner",
      label: fieldLabel("partnerId", "Người nhận"),
      children: editable ? (
        <InternalPartnerSelect
          value={issue.partnerId ?? undefined}
          current={
            issue.partnerId
              ? { id: issue.partnerId, code: issue.partnerCode, name: issue.partnerName }
              : null
          }
          onChange={(value) => (value ? void save("partnerId", { partnerId: value }) : null)}
        />
      ) : (
        `${issue.partnerCode ?? ""} ${issue.partnerName ?? "—"}`.trim()
      ),
    },
  ];

  return (
    <Descriptions
      bordered
      size="small"
      // Nền trắng cả ô nhãn — khối đầu phiếu thành thẻ trắng như màn đơn đặt.
      className="overflow-hidden rounded-the bg-white shadow-the"
      styles={{ label: { background: "#fff" } }}
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
          children: (
            <StatusDot tone={DOC_STATUS_TONES[issue.status]} strike={issue.status === "DA_HUY"}>
              {DOC_STATUS_LABELS[issue.status]}
            </StatusDot>
          ),
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
        ...recipientItems,
        {
          key: "order",
          label: "Đơn gốc",
          children: issue.orderId ? (
            <Link href={`/don-dat/${issue.orderId}`}>{issue.orderNo}</Link>
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
              placeholder="Gõ tên người nhận và ghi chú cho phiếu"
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
