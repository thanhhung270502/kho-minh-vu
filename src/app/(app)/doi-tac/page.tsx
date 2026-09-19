import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { PartnerTable } from "@/features/partners/components/partner-table";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đối tác" };

export default async function PartnersPage() {
  const user = await requirePermission("view-catalog");
  const canEdit = hasPermission(user.role, "edit-catalog");

  return (
    <>
      <PageHeader
        title="Đối tác"
        description="Nhà cung cấp và khách hàng trong một danh sách."
        actions={
          canEdit ? <Link href="/doi-tac/ra-ghi-chu">Rà ghi chú KiotViet</Link> : null
        }
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <PartnerTable canEdit={canEdit} />
      </Suspense>
    </>
  );
}
