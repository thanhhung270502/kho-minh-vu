"use client";

import { App, Input, Typography } from "antd";
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
export function OrderAside({ order, editable }: Props) {
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

  const metaLabel = "text-xs text-trung-tinh-350";
  const metaValue = "text-[15.5px] font-semibold";

  return (
    <aside className="flex flex-col gap-4 rounded-the border border-vien bg-white p-5">
      <h2 className="m-0 text-[16px] font-extrabold">Thông tin đơn</h2>

      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-bold text-chu-phu">
          {fieldLabel("recipient", "Người nhận")}
        </div>
        {editable ? (
          <OrderRecipientField recipients={order.recipients} onSave={saveRecipients} />
        ) : (
          <RecipientsReadonly recipients={order.recipients} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-bold text-chu-phu">{fieldLabel("note", "Ghi chú")}</div>
        {editable ? (
          <Input.TextArea
            defaultValue={order.note ?? ""}
            placeholder="Gõ tên người nhận và ghi chú cho đơn"
            autoSize={{ minRows: 2, maxRows: 5 }}
            onBlur={(event) => void save("note", { note: event.target.value || null })}
          />
        ) : (
          <span className="text-[15.5px]">{order.note ?? "—"}</span>
        )}
      </div>

      <hr className="m-0 border-vien" />

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className={metaLabel}>Số đơn</dt>
          <dd className={`m-0 font-mono ${metaValue}`}>{order.orderNo}</dd>
        </div>
        <div>
          <dt className={metaLabel}>Ngày đơn</dt>
          <dd className={`m-0 ${metaValue}`}>{dayjs(order.orderDate).format("DD/MM/YYYY")}</dd>
        </div>
        <div>
          <dt className={metaLabel}>Người tạo</dt>
          <dd className={`m-0 ${metaValue}`}>{order.createdByName ?? "—"}</dd>
        </div>
        <div>
          <dt className={metaLabel}>Trạng thái</dt>
          <dd className={`m-0 ${metaValue}`}>
            <StatusDot tone={ORDER_STATUS_TONES[order.status]} strike={order.status === "DA_HUY"}>
              {ORDER_STATUS_LABELS[order.status]}
            </StatusDot>
          </dd>
        </div>
      </dl>
    </aside>
  );
}
