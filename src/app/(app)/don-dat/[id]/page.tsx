import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetailView } from "@/features/sales-order/components/order-detail";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { can } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đơn đặt" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("view-catalog");

  return (
    <OrderDetailView
      id={id}
      permissions={{
        canEdit: can(user, "tao_don"),
        // Xác nhận / mở lại / đóng sớm theo quyền chức vụ "Xác nhận". Chặn thật
        // ở ba RPC (co_quyen, 0083); đây chỉ để ẩn nút.
        canApprove: can(user, "xac_nhan_don"),
        canComplete: can(user, "xac_nhan_don"),
        // Hủy đơn chỉ phạm vi quản trị (huy_duoc_don, 0078).
        canCancel: user.role === "quan_ly",
      }}
    />
  );
}
