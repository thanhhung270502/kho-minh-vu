import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { BangDoiTac } from "@/features/doi-tac/components/bang-doi-tac";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đối tác" };

export default async function DoiTacPage() {
  const nd = await requirePermission("view-catalog");
  const coQuyenSua = hasPermission(nd.role, "edit-catalog");

  return (
    <>
      <PageHeader
        title="Đối tác"
        description="Nhà cung cấp và khách hàng trong một danh sách."
        actions={
          coQuyenSua ? <Link href="/doi-tac/ra-ghi-chu">Rà ghi chú KiotViet</Link> : null
        }
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangDoiTac coQuyenSua={coQuyenSua} />
      </Suspense>
    </>
  );
}
