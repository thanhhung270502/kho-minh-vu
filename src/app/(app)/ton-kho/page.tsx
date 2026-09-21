import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { StockTable } from "@/features/inventory/components/stock-table";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Tồn kho" };

export default async function StockPage() {
  // Mọi vai trò xem được. Phạm vi kho của thủ kho do `danh_sach_ton_kho` siết ở
  // database — giao diện không lọc lại.
  const user = await requirePermission("view-catalog");
  const canLoadProvisionalStock = hasPermission(
    user.role,
    "load-provisional-stock",
  );

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Số tồn tính từ chứng từ đã ghi sổ — không sửa trực tiếp được."
        // Hai màn con không có mục menu riêng (việc định kỳ / một lần) — đây là
        // lối vào của chúng, theo khuôn "Rà ghi chú KiotViet" ở /doi-tac.
        actions={
          <>
            {hasPermission(user.role, "edit-catalog") ? (
              <Link href="/ton-kho/dinh-muc">Duyệt định mức tồn</Link>
            ) : null}
            {canLoadProvisionalStock ? (
              <Link href="/ton-kho/nap-tam">Nạp tồn tạm</Link>
            ) : null}
          </>
        }
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <StockTable
          canLoadProvisionalStock={canLoadProvisionalStock}
          limitToAssignedWarehouses={user.role === "thu_kho"}
        />
      </Suspense>
    </>
  );
}
