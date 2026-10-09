"use client";

import { Button, Skeleton } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { QueryState } from "@/shared/components/query-state";
import {
  QuickViewField as Field,
  QuickViewFrame,
  QuickViewLineTable,
  QuickViewNote,
  formatQuantity,
} from "@/shared/components/quick-view";
import { StatusDot } from "@/shared/components/status-dot";
import { formatOrderRecipients } from "@/shared/lib/recipient";

import { useOrderDetail, useOrderLines, useUpdateOrderHeader } from "../hooks/useOrders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../lib/order-status";
import type { OrderLine, OrderPermissions } from "../types";
import { OrderActions } from "./order-actions";
import { OrderProgress } from "./order-progress";

type Props = { id: string; permissions: OrderPermissions };

/**
 * Bấm một dòng của danh sách Đơn đặt: xem nhanh đơn ngay trong bảng — thông tin, dòng
 * hàng, ghi chú và đúng các nút của trang đơn (xác nhận, hoàn thành, in, mở khóa, hủy…).
 * Sửa dòng hàng thì "Mở đơn".
 */
export function OrderExpanded({ id, permissions }: Props) {
  const detail = useOrderDetail(id);
  const lines = useOrderLines(id);
  const update = useUpdateOrderHeader(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(order) => order === null}
      emptyDescription="Không tìm thấy đơn này."
      skeleton={<Skeleton active paragraph={{ rows: 4 }} />}
    >
      {(order) => {
        if (!order) return null;
        const editable = order.status === "TAM" && permissions.canEdit;
        const recipients = formatOrderRecipients(order.recipients);
        const all = lines.data ?? [];

        return (
          <QuickViewFrame>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold">{order.orderNo}</span>
              <StatusDot tone={ORDER_STATUS_TONES[order.status]} variant="badge" strike={order.status === "DA_HUY"}>
                {ORDER_STATUS_LABELS[order.status]}
              </StatusDot>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Field label="Người tạo">{order.createdByName ?? "—"}</Field>
              <Field label="Người duyệt">
                {order.approvedByName
                  ? `${order.approvedByName}${order.approvedAt ? ` · ${dayjs(order.approvedAt).format("HH:mm DD/MM")}` : ""}`
                  : "—"}
              </Field>
              <Field label="Ngày đơn">{dayjs(order.orderDate).format("DD/MM/YYYY")}</Field>
              <Field label="Tiến độ">
                <OrderProgress shipped={order.shippedQuantity} ordered={order.orderedQuantity} />
              </Field>
              <Field label="Hóa đơn">
                {order.invoice ? (
                  <Link href={`/duyet-don/${order.invoice.id}`} className="font-mono">
                    {order.invoice.number}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
            </div>

            <QueryState query={lines} isEmpty={() => false} emptyDescription="">
              {(all) => (
                <QuickViewLineTable<OrderLine>
                  lines={all}
                  quantityColumns={[
                    {
                      title: "Người nhận",
                      dataIndex: "recipientName",
                      width: 140,
                      ellipsis: true,
                      render: (name: string | null) => name ?? <span className="text-chu-phu">Chung</span>,
                    },
                    { title: "Đặt", dataIndex: "orderedQuantity", width: 90, align: "right", render: formatQuantity },
                    { title: "Đã giao", dataIndex: "shippedQuantity", width: 90, align: "right", render: formatQuantity },
                  ]}
                />
              )}
            </QueryState>

            <QuickViewNote
              value={order.note ?? ""}
              editable={editable}
              onSave={(note) => update.mutateAsync({ note })}
              summary={[
                { label: "Số dòng", value: formatQuantity(all.length) },
                { label: "Tổng số lượng đặt", value: formatQuantity(order.orderedQuantity) },
                // formatOrderRecipients đã trả "Chưa chọn người nhận" khi đơn trống người nhận.
                { label: "Người nhận", value: recipients },
              ]}
            />

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-vien pt-3">
              <Link href={`/don-dat/${id}`}>
                <Button type="primary">Mở đơn</Button>
              </Link>
              <OrderActions orderId={id} order={order} lines={all} permissions={permissions} />
            </div>
          </QuickViewFrame>
        );
      }}
    </QueryState>
  );
}
