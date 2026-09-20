"use client";

import { Alert, Button, Space, Tag, Typography } from "antd";
import Link from "next/link";

import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useOrderDetail, useOrderLines } from "../hooks/useOrders";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../lib/order-status";
import type { OrderPermissions } from "../types";
import { OrderHeader } from "./order-header";
import { OrderLineTable } from "./order-line-table";

export function OrderDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: OrderPermissions;
}) {
  const detail = useOrderDetail(id);
  const lines = useOrderLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(order) => order === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>
            Không tìm thấy đơn này, hoặc đơn không thuộc quyền xem của bạn.
          </span>
          <Link href="/dat-hang">
            <Button size="small">Về danh sách đơn</Button>
          </Link>
        </div>
      }
    >
      {(order) => {
        if (!order) return null;

        // D-04/D-06/D-07: đơn còn tạm mới sửa được ở giao diện; đã xác nhận thì
        // chỉ quản lý mở lại mới sửa tiếp — chặn thật ở policy của plan 04-02.
        const editable = permissions.canEdit && order.status === "TAM";

        return (
          <>
            <Link href="/dat-hang" className="mb-2 inline-block text-sm">
              ← Đơn đặt hàng
            </Link>

            <PageHeader
              title={order.orderNo}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <Tag color={ORDER_STATUS_COLORS[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Tag>
                  {order.partnerName ?? "Chưa chọn người nhận"}
                </span>
              }
              actions={
                // Nút xác nhận / mở lại / đóng sớm / in / tạo phiếu xuất cắm vào
                // đúng chỗ này ở plan 04-12 — dùng permissions.canApprove để
                // ẩn/hiện nút xác nhận (chỉ quản lý bấm được, D-06).
                <Space wrap>
                  <Typography.Text type="secondary" className="text-xs">
                    Nút xác nhận / mở lại / đóng sớm / in / tạo phiếu xuất — plan
                    04-12
                  </Typography.Text>
                </Space>
              }
            />

            {order.status !== "TAM" && permissions.canEdit ? (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                title="Đơn đã xác nhận nên khóa sửa"
                description="Muốn sửa đầu đơn hoặc dòng đơn, nhờ quản lý mở lại đơn về đơn tạm trước."
              />
            ) : null}

            <OrderHeader order={order} editable={editable} />

            <div className="mt-4">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <OrderLineTable
                    orderId={id}
                    lines={loadedLines}
                    editable={editable}
                  />
                )}
              </QueryState>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
