import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetailView } from "@/features/sales-order/components/order-detail";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đơn đặt hàng" };

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
        canEdit: hasPermission(user.role, "edit-catalog"),
        // D-06: chỉ quản lý xác nhận/mở lại/đóng sớm. Chặn thật ở ba RPC của
        // plan 04-02; đây chỉ để ẩn nút.
        canApprove: user.role === "quan_ly",
      }}
    />
  );
}
