import type { Metadata } from "next";
import { Suspense } from "react";

import { ReceiptTable } from "@/features/stock-in/components/receipt-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phiếu nhập" };

export default async function StockInPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Phiếu nhập"
        description="Hàng về kho — ghi sổ xong là tồn tăng và giá vốn tính lại."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <ReceiptTable canCreate={hasPermission(user.role, "edit-catalog")} />
      </Suspense>
    </>
  );
}
