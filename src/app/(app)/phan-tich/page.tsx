import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { AnalysisView } from "@/features/analytics/components/analysis-view";
import { PageHeader } from "@/shared/components/page-header";

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
      <AnalysisView canEditSettings={user.role === "quan_ly"} />
    </>
  );
}
