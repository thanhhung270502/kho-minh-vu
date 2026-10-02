import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { ProductImageGallery } from "@/features/images/components/product-image-gallery";
import { ProductDetailView } from "@/features/products/components/product-detail";
import { can, hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Chi tiết mã hàng" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("view-catalog");

  return (
    <ProductDetailView
      id={id}
      permissions={{
        canEdit: can(user, "tao_ma_hang"),
        // Lịch sử sửa đọc theo phạm vi (RLS nhat_ky_sua: quản lý + văn phòng).
        canViewHistory: hasPermission(user.role, "edit-catalog"),
      }}
      imagesSection={
        <ProductImageGallery
          productId={id}
          canEdit={can(user, "tao_ma_hang")}
        />
      }
    />
  );
}
