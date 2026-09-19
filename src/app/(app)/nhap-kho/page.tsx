import type { Metadata } from "next";
import { Suspense } from "react";

import { BangPhieuNhap } from "@/features/nhap-kho/components/bang-phieu-nhap";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phiếu nhập" };

export default async function NhapKhoPage() {
  const nd = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Phiếu nhập"
        description="Hàng về kho — ghi sổ xong là tồn tăng và giá vốn tính lại."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangPhieuNhap coQuyenTao={hasPermission(nd.role, "edit-catalog")} />
      </Suspense>
    </>
  );
}
