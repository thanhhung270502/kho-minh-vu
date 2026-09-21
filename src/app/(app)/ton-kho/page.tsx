import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { StockTable } from "@/features/inventory/components/stock-table";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tồn kho" };

export default async function StockPage() {
  // Mọi vai trò xem được. Phạm vi kho của thủ kho do `danh_sach_ton_kho` siết ở
  // database — giao diện không lọc lại.
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Số tồn tính từ chứng từ đã ghi sổ — không sửa trực tiếp được."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <StockTable
          canLoadProvisionalStock={user.role === "quan_ly"}
          limitToAssignedWarehouses={user.role === "thu_kho"}
        />
      </Suspense>
    </>
  );
}
