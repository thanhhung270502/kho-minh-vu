"use client";

import { App, Button, Space } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useApproveOrder, useCreateIssueFromOrder } from "../hooks/useOrders";
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
  const router = useRouter();
  const approve = useApproveOrder(orderId);
  const createIssue = useCreateIssueFromOrder(orderId);

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

  function confirmCreateIssue() {
    modal.confirm({
      title: `Tạo phiếu xuất từ đơn ${order.orderNo}?`,
      width: 560,
      content: `Sinh phiếu xuất từ đơn ${order.orderNo}: ${lines.length} dòng, mọi dòng điền sẵn số lượng bằng số đặt. Kho từng dòng lấy theo kho mặc định của mã hàng. Sửa lại dòng nào kho lấy thiếu rồi ghi sổ.`,
      okText: "Tạo phiếu xuất",
      cancelText: "Thôi",
      onOk: async () => {
        try {
          const issueId = await createIssue.mutateAsync();
          router.push(`/xuat-kho/${issueId}`);
        } catch (error) {
          // 23514 hay gặp nhất: mã thiếu kho mặc định (liệt kê đúng mã) hoặc
          // đơn vừa bị mở khóa — hiện nguyên văn message RPC (bẫy 8).
          if (isPostgrestError(error) && error.code === "23514") {
            modal.error({
              title: "Không tạo được phiếu xuất",
              content: (
                <Space direction="vertical">
                  <span>{error.message}</span>
                  <Link href="/danh-muc">
                    <Button type="link" className="px-0">
                      Đi sửa kho mặc định ở Danh mục
                    </Button>
                  </Link>
                </Space>
              ),
            });
            return;
          }
          if (errorCode(error) === "42501") {
            message.error("Tài khoản không có quyền tạo phiếu xuất.");
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

        {order.status === "DA_XAC_NHAN" && permissions.canEdit ? (
          <Button loading={createIssue.isPending} onClick={confirmCreateIssue}>
            Tạo phiếu xuất
          </Button>
        ) : null}

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
