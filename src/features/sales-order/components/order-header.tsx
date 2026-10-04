"use client";

import { App, Descriptions, Input, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { StatusDot } from "@/shared/components/status-dot";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useSetOrderRecipients, useUpdateOrderHeader } from "../hooks/useOrders";
import { ORDER_STATUS_TONES, ORDER_STATUS_LABELS } from "../lib/order-status";
import type { OrderHeaderInput, OrderRecipientsInput } from "../schemas/order.schema";
import type { OrderDetail } from "../types";
import { OrderRecipientField, RecipientsReadonly } from "./order-recipient-field";

type Props = { order: OrderDetail; editable: boolean };

/** Đơn đã xác nhận thì chỉ đọc — chặn thật nằm ở bốn policy ghi của plan 04-02. */
export function OrderHeader({ order, editable }: Props) {
  const { message } = App.useApp();
  const update = useUpdateOrderHeader(order.id);
  const setRecipients = useSetOrderRecipients(order.id);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  function reportError(error: unknown) {
    if (errorCode(error) === "42501") {
      message.error("Bạn không có quyền sửa đơn này. Liên hệ quản trị hệ thống.");
      return;
    }
    // Câu của DB đã nêu rõ mã hàng đang được gán / đơn đã xác nhận / nội bộ rỗng.
    if (isPostgrestError(error) && error.code === "23514") {
      message.error(error.message);
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

  async function save(field: string, values: Partial<OrderHeaderInput>): Promise<boolean> {
    try {
      await update.mutateAsync(values);
      markSaved(field);
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  }

  async function saveRecipients(input: OrderRecipientsInput): Promise<boolean> {
    try {
      await setRecipients.mutateAsync(input);
      markSaved("recipient");
      return true;
    } catch (error) {
      reportError(error);
      return false;
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
          key: "orderNo",
          label: "Số đơn",
          children: <span className="font-mono">{order.orderNo}</span>,
        },
        {
          key: "orderDate",
          label: "Ngày đơn",
          children: dayjs(order.orderDate).format("DD/MM/YYYY"),
        },
        {
          key: "partner",
          label: fieldLabel("recipient", "Người nhận"),
          children: editable ? (
            <OrderRecipientField recipients={order.recipients} onSave={saveRecipients} />
          ) : (
            <RecipientsReadonly recipients={order.recipients} />
          ),
        },
        {
          key: "createdBy",
          label: "Người tạo",
          children: order.createdByName ?? "—",
        },
        {
          key: "status",
          label: "Trạng thái",
          children: (
            <StatusDot tone={ORDER_STATUS_TONES[order.status]} strike={order.status === "DA_HUY"}>
              {ORDER_STATUS_LABELS[order.status]}
            </StatusDot>
          ),
        },
        {
          key: "note",
          label: fieldLabel("note", "Ghi chú"),
          children: editable ? (
            <Input.TextArea
              defaultValue={order.note ?? ""}
              placeholder="Ghi chú cho đơn này"
              autoSize={{ minRows: 1, maxRows: 3 }}
              onBlur={(event) =>
                void save("note", { note: event.target.value || null })
              }
            />
          ) : (
            (order.note ?? "—")
          ),
        },
      ]}
    />
  );
}
