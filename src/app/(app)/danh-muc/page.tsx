import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductTable } from "@/features/products/components/product-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Danh mục hàng" };

export default async function DanhMucPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Danh mục hàng"
        description="Tìm theo mã hoặc tên, gõ không dấu cũng được."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <ProductTable
          permissions={{
            canEdit: hasPermission(user.role, "edit-catalog"),
            canViewCost: hasPermission(user.role, "view-cost"),
            canEditSalePrice: hasPermission(user.role, "edit-sale-price"),
          }}
        />
      </Suspense>
    </>
  );
}
