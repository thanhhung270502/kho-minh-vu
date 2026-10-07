import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { AnalysisView } from "@/features/analytics/components/analysis-view";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Phân tích tồn kho" };

export default async function Page() {
  // Chặn thật ở xem_duoc_phan_tich() (0079) — tồn mọi kho nên thủ kho không vào.
  await requirePermission("view-analysis");

  return (
    <>
      <PageHeader
        title="Phân tích tồn kho"
        description="Xuất bao nhiêu, nhập bao nhiêu theo tuần, tháng, quý, năm — mã nào sắp hết, cần nhập bao nhiêu."
      />
      {/* `useSearchParams()` (bộ lọc trên URL) bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <AnalysisView />
      </Suspense>
    </>
  );
}
