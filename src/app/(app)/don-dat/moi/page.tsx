import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { NewOrderCard } from "@/features/sales-order/components/new-order-card";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tạo đơn đặt" };

// Danh sách đã tạo đơn bằng dialog; route này giữ lại cho link/bookmark cũ.
export default async function Page() {
  // Khớp policy insert don_dat_hang (0052): quản lý + văn phòng.
  await requirePermission("tao_don");

  return (
    <>
      <PageHeader title="Tạo đơn đặt" description="Mặc định nhận Nội bộ — đổi sang Đối tác nếu giao cho khách." />
      <NewOrderCard />
      <Link href="/don-dat" className="text-sm">
        ← Về danh sách đơn
      </Link>
    </>
  );
}
