import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductTable } from "@/features/products/components/product-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Danh sách hàng hóa" };

export default async function ProductsPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Danh sách hàng hóa"
        description="Tìm theo mã hoặc tên, gõ không dấu cũng được."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <ProductTable
          permissions={{
            canEdit: hasPermission(user.role, "edit-catalog"),
          }}
        />
      </Suspense>
    </>
  );
}
