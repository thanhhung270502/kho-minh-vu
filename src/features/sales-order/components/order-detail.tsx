"use client";

import { Alert, Button } from "antd";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";
import { formatOrderRecipients } from "@/shared/lib/recipient";

import { useOrderDetail, useOrderLines } from "../hooks/useOrders";
import { ORDER_STATUS_TONES, ORDER_STATUS_LABELS } from "../lib/order-status";
import type { OrderPermissions } from "../types";
import { OrderActions } from "./order-actions";
import { OrderAside } from "./order-aside";
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
  const orderLines = lines.data ?? [];

  return (
    <QueryState
      query={detail}
      isEmpty={(order) => order === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>
            Không tìm thấy đơn này, hoặc đơn không thuộc quyền xem của bạn.
          </span>
          <Link href="/don-dat">
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
            <Link href="/don-dat" className="mb-2 inline-block text-[14px] font-semibold text-chu-phu">
              ← Đơn đặt
            </Link>

            <PageHeader
              title={order.orderNo}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusDot tone={ORDER_STATUS_TONES[order.status]} variant="badge">
                    {ORDER_STATUS_LABELS[order.status]}
                  </StatusDot>
                  {formatOrderRecipients(order.recipients)}
                </span>
              }
              actions={
                <OrderActions
                  orderId={id}
                  order={order}
                  lines={orderLines}
                  permissions={permissions}
                />
              }
            />

            {order.status === "DA_XAC_NHAN" && (permissions.canEdit || permissions.canComplete) ? (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                title="Đơn đã xác nhận nên khóa sửa"
                description="Muốn sửa đầu đơn hoặc dòng đơn, nhờ quản lý mở lại đơn về đơn tạm trước."
              />
            ) : null}
            {order.status === "HOAN_THANH" ? (
              <Alert
                className="mb-4"
                type="success"
                showIcon
                title="Đơn đã hoàn thành"
                description={
                  order.invoice ? (
                    <>
                      Hóa đơn{" "}
                      <Link href={`/duyet-don/${order.invoice.id}`} className="font-mono">
                        {order.invoice.number}
                      </Link>{" "}
                      đã ghi sổ. Giao sai thì quản lý hủy hóa đơn đó — đơn quay về Đã xác nhận.
                    </>
                  ) : (
                    "Đơn đóng sớm, không có hóa đơn. Khách lấy thêm thì lập đơn mới."
                  )
                }
              />
            ) : null}
            {order.status === "DA_HUY" ? (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                title="Đơn đã hủy"
                description="Đơn này không mở lại được. Khách lấy thêm thì lập đơn mới."
              />
            ) : null}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <OrderLineTable
                    key={id}
                    orderId={id}
                    lines={loadedLines}
                    editable={editable}
                    staff={order.recipients.staff}
                  />
                )}
              </QueryState>
              <OrderAside order={order} editable={editable} />
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
