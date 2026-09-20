import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { OrderTable } from "@/features/sales-order/components/order-table";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đơn đặt hàng" };

export default async function SalesOrderPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Đơn đặt hàng"
        description="Đơn tạm cho tới khi quản lý xác nhận — xác nhận xong mới in phiếu đi lấy hàng."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <OrderTable canCreate={hasPermission(user.role, "edit-catalog")} />
      </Suspense>
    </>
  );
}
