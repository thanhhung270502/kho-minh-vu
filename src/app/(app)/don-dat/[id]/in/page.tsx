import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PickingPrintPage } from "@/features/sales-order/components/picking-print-page";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "In phiếu đi lấy hàng" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route riêng thay vì ẩn/hiện bằng CSS trên trang chi tiết đơn: trang chi
 * tiết có ô nhập liệu, in ra sẽ dính cả khung nhập (giống
 * nhap-kho/[id]/in/page.tsx).
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await requirePermission("view-catalog");

  return <PickingPrintPage id={id} />;
}
