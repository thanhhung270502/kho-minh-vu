import type { Metadata } from "next";
import { Suspense } from "react";

import { IssueTable } from "@/features/stock-out/components/issue-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phiếu xuất" };

export default async function StockOutPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Phiếu xuất"
        description="Hàng ra kho — ghi sổ xong là tồn giảm."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <IssueTable canCreate={hasPermission(user.role, "edit-catalog")} />
      </Suspense>
    </>
  );
}
