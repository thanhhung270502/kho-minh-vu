import type { Metadata } from "next";
import { Suspense } from "react";

import { BangSanPham } from "@/features/danh-muc/components/bang-san-pham";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Danh mục hàng" };

export default async function DanhMucPage() {
  const nd = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Danh mục hàng"
        description="Tìm theo mã hoặc tên, gõ không dấu cũng được."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangSanPham
          quyen={{
            sua: hasPermission(nd.role, "edit-catalog"),
            xemGiaVon: hasPermission(nd.role, "view-cost"),
            suaGiaBan: hasPermission(nd.role, "edit-sale-price"),
          }}
        />
      </Suspense>
    </>
  );
}
