"use client";

import { App, DatePicker, Descriptions, Input, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useUpdateOrderHeader } from "../hooks/useOrders";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/order-status";
import type { OrderHeaderInput } from "../schemas/order.schema";
import type { OrderDetail } from "../types";

type Props = { order: OrderDetail; editable: boolean };

/** Đơn đã xác nhận thì chỉ đọc — chặn thật nằm ở bốn policy ghi của plan 04-02. */
export function OrderHeader({ order, editable }: Props) {
  const { message } = App.useApp();
  const update = useUpdateOrderHeader(order.id);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  async function save(field: string, values: Partial<OrderHeaderInput>) {
    try {
      await update.mutateAsync(values);
      setJustSaved(field);
      setTimeout(() => setJustSaved(null), 2000);
    } catch (error) {
      if (errorCode(error) === "42501") {
        message.error("Bạn không có quyền sửa đơn này. Liên hệ quản trị hệ thống.");
        return;
      }
      // Lớp api ném Error thường (không phải PostgrestError) khi RLS lọc im
      // lặng — count trả về rỗng. Hiện nguyên văn câu đó, đã đủ rõ đường phục
      // hồi (bẫy 8: đây không phải PostgrestError, không dùng instanceof).
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
          label: fieldLabel("partnerId", "Người nhận"),
          children: editable ? (
            <PartnerSearchInput
              value={order.partnerId}
              onChange={(value) =>
                value ? void save("partnerId", { partnerId: value }) : null
              }
            />
          ) : (
            `${order.partnerCode ?? ""} ${order.partnerName ?? "—"}`.trim()
          ),
        },
        {
          key: "deliveryDate",
          label: fieldLabel("deliveryDate", "Ngày giao dự kiến"),
          children: editable ? (
            <DatePicker
              format="DD/MM/YYYY"
              allowClear
              value={order.deliveryDate ? dayjs(order.deliveryDate) : null}
              onChange={(value) =>
                void save("deliveryDate", {
                  deliveryDate: value ? value.format("YYYY-MM-DD") : null,
                })
              }
            />
          ) : order.deliveryDate ? (
            dayjs(order.deliveryDate).format("DD/MM/YYYY")
          ) : (
            "—"
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
            <Tag color={ORDER_STATUS_COLORS[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Tag>
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
