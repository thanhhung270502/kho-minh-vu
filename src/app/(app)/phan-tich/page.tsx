import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { AnalysisView } from "@/features/analytics/components/analysis-view";
import { ReorderLevelTable } from "@/features/inventory/components/reorder-level-table";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phân tích tồn kho" };

export default async function Page() {
  // Chặn thật ở xem_duoc_phan_tich() (0079) — tồn mọi kho nên thủ kho không vào.
  const user = await requirePermission("view-analysis");

  return (
    <>
      <PageHeader
        title="Phân tích tồn kho"
        description="Mã nào cần nhập, nhập bao nhiêu, mã nào hết mà vẫn có khách mua, tồn nào đang nằm chết."
      />
      {/* `useSearchParams()` (tab trên URL) bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <AnalysisView
          canEditSettings={user.role === "quan_ly"}
          // Duyệt định mức ghi ton_toi_thieu — cùng quyền dat_dinh_muc (0060): quản lý + văn phòng.
          reorderSection={hasPermission(user.role, "edit-catalog") ? <ReorderLevelTable /> : null}
        />
      </Suspense>
    </>
  );
}
