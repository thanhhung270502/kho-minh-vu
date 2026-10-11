"use client";

import { App, Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { ReopenPostedButton } from "@/features/documents/components/reopen-posted-button";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { orderKeys } from "../api/order.keys";
import { useApproveOrder } from "../hooks/useOrders";
import { orderActionsFor } from "../lib/order-actions";
import type { OrderDetail, OrderLine, OrderPermissions } from "../types";
import { CompleteOrderDialog } from "./complete-order-dialog";
import { OrderStatusDialog } from "./order-status-dialog";

type Props = {
  orderId: string;
  order: OrderDetail;
  lines: OrderLine[];
  permissions: OrderPermissions;
};

type ReasonMode = "unlock" | "close-early" | "cancel";

const ORDER_KEYS = [orderKeys.all];

/**
 * Nút theo trạng thái × quyền — bảng ở `lib/order-actions.ts`. Ẩn nút chỉ là
 * trang trí, chặn thật nằm ở RPC (0052, 0078).
 */
export function OrderActions({ orderId, order, lines, permissions }: Props) {
  const { message, modal } = App.useApp();
  const approve = useApproveOrder(orderId);
  const actions = orderActionsFor(order.status, permissions);

  const [statusDialog, setStatusDialog] = useState<{ mode: ReasonMode; open: boolean }>({
    mode: "unlock",
    open: false,
  });
  const [completeOpen, setCompleteOpen] = useState(false);

  function confirmApprove() {
    modal.confirm({
      title: `Xác nhận đơn ${order.orderNo}?`,
      content: `Đơn có ${lines.length} dòng, tổng số lượng đặt ${order.orderedQuantity.toLocaleString("vi-VN")}. Sau khi xác nhận, muốn sửa tiếp phải bấm Sửa đơn.`,
      okText: "Xác nhận đơn",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await approve.mutateAsync();
          message.success("Đã xác nhận. In phiếu, giao xong bấm Hoàn thành.");
        } catch (error) {
          if (isPostgrestError(error) && error.code === "23514") {
            message.error(error.message);
            return;
          }
          if (errorCode(error) === "42501") {
            message.error("Chỉ quản lý được xác nhận đơn.");
            return;
          }
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      },
    });
  }

  const openReason = (mode: ReasonMode) => setStatusDialog({ mode, open: true });

  return (
    <>
      <Space wrap>
        {actions.includes("approve") ? (
          <Button type="primary" loading={approve.isPending} onClick={confirmApprove}>
            Xác nhận đơn
          </Button>
        ) : null}
        {actions.includes("complete") ? (
          <Button type="primary" onClick={() => setCompleteOpen(true)}>
            Hoàn thành
          </Button>
        ) : null}
        {actions.includes("print") ? (
          <Link href={`/don-dat/${orderId}/in`} target="_blank">
            <Button>In phiếu</Button>
          </Link>
        ) : null}
        {actions.includes("edit-invoice") && order.invoice ? (
          <ReopenPostedButton
            document={{
              id: order.invoice.id,
              docNo: order.invoice.number,
              status: "HOAN_THANH",
              orderId,
            }}
            label="Sửa đơn"
            canReopen
            detailHref={(draftId) => `/duyet-don/${draftId}`}
            forbiddenMessage="Chức vụ của bạn chưa có quyền Sửa hóa đơn."
            extraInvalidateKeys={ORDER_KEYS}
          />
        ) : null}
        {actions.includes("unlock") ? (
          <Button onClick={() => openReason("unlock")}>Sửa đơn</Button>
        ) : null}
        {actions.includes("close-early") ? (
          <Button onClick={() => openReason("close-early")}>Đóng sớm</Button>
        ) : null}
        {actions.includes("cancel") ? (
          <Button danger onClick={() => openReason("cancel")}>
            Hủy đơn
          </Button>
        ) : null}
      </Space>

      <OrderStatusDialog
        mode={statusDialog.mode}
        open={statusDialog.open}
        onClose={() => setStatusDialog((current) => ({ ...current, open: false }))}
        orderId={orderId}
        orderNo={order.orderNo}
      />
      <CompleteOrderDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        orderId={orderId}
        orderNo={order.orderNo}
        lineCount={lines.length}
        orderedQuantity={order.orderedQuantity}
      />
    </>
  );
}
