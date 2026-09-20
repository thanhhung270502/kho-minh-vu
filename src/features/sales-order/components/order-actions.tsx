"use client";

import { App, Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useApproveOrder } from "../hooks/useOrders";
import type { OrderDetail, OrderLine, OrderPermissions } from "../types";
import { OrderStatusDialog } from "./order-status-dialog";

type Props = {
  orderId: string;
  order: OrderDetail;
  lines: OrderLine[];
  permissions: OrderPermissions;
};

/**
 * Nút nào hiện khi nào (bảng ở 04-12-PLAN.md <context>): ẩn nút chỉ là trang
 * trí, chặn thật nằm ở ba RPC duyệt đơn (plan 04-02). Nút thiếu quyền KHÔNG
 * render — không dùng `disabled`.
 */
export function OrderActions({ orderId, order, lines, permissions }: Props) {
  const { message, modal } = App.useApp();
  const approve = useApproveOrder(orderId);

  const [statusDialog, setStatusDialog] = useState<{
    mode: "unlock" | "close-early";
    open: boolean;
  }>({ mode: "unlock", open: false });

  function confirmApprove() {
    modal.confirm({
      title: `Xác nhận đơn ${order.orderNo}?`,
      content: `Đơn có ${lines.length} dòng, tổng số lượng đặt ${order.orderedQuantity.toLocaleString("vi-VN")}. Sau khi xác nhận, chỉ quản lý mở khóa lại được để sửa tiếp.`,
      okText: "Xác nhận đơn",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await approve.mutateAsync();
          message.success("Đã xác nhận. In phiếu đi lấy hàng hoặc tạo phiếu xuất.");
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

  const canShowPrint = order.status !== "TAM" && order.status !== "DA_HUY";

  return (
    <>
      <Space wrap>
        {order.status === "TAM" && permissions.canApprove ? (
          <Button type="primary" loading={approve.isPending} onClick={confirmApprove}>
            Xác nhận đơn
          </Button>
        ) : null}

        {order.status === "DA_XAC_NHAN" && permissions.canApprove ? (
          <>
            <Button onClick={() => setStatusDialog({ mode: "unlock", open: true })}>
              Mở khóa
            </Button>
            <Button onClick={() => setStatusDialog({ mode: "close-early", open: true })}>
              Đóng sớm
            </Button>
          </>
        ) : null}

        {/* Nút "Tạo phiếu xuất" cắm vào đây ở Task 2. */}

        {canShowPrint ? (
          <Link href={`/dat-hang/${orderId}/in`} target="_blank">
            <Button>In phiếu đi lấy hàng</Button>
          </Link>
        ) : null}
      </Space>

      <OrderStatusDialog
        mode={statusDialog.mode}
        open={statusDialog.open}
        onClose={() => setStatusDialog((current) => ({ ...current, open: false }))}
        orderId={orderId}
        orderNo={order.orderNo}
      />
    </>
  );
}
