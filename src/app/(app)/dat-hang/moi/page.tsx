import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { NewOrderForm } from "@/features/sales-order/components/new-order-form";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tạo đơn đặt hàng" };

export default async function Page() {
  // Khớp policy insert don_dat_hang (0052): quản lý + văn phòng.
  await requirePermission("tao_don");

  return (
    <>
      <PageHeader title="Tạo đơn đặt hàng" description="Mặc định nhận Nội bộ — đổi sang Đối tác nếu giao cho khách." />
      <NewOrderForm />
    </>
  );
}
