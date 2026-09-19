import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChiTietSanPham } from "@/features/danh-muc/components/chi-tiet-san-pham";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Chi tiết mã hàng" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const nd = await requirePermission("view-catalog");

  return (
    <ChiTietSanPham
      id={id}
      quyen={{
        sua: hasPermission(nd.role, "edit-catalog"),
        xemGiaVon: hasPermission(nd.role, "view-cost"),
        suaGiaBan: hasPermission(nd.role, "edit-sale-price"),
        xemLichSu: hasPermission(nd.role, "edit-catalog"),
      }}
    />
  );
}
