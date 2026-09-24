import type { Metadata } from "next";
import { Suspense } from "react";

import { requireKiotVietHistoryAccess } from "@/features/auth/api/current-user.server";
import { HistoryScreen } from "@/features/kiotviet-history/components/history-screen";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Lịch sử KiotViet" };

export default async function LichSuKiotVietPage() {
  // Quyền THEO NGƯỜI (D-13), không theo Permission/Role tĩnh — chặn thật ở
  // RLS/RPC (migration 0064).
  await requireKiotVietHistoryAccess();

  return (
    <>
      <PageHeader
        title="Lịch sử KiotViet"
        description="Tra cứu phiếu nhập và hóa đơn cũ từ hệ KiotViet — chỉ để xem lại, không phải sổ kho."
      />

      {/* `useSearchParams()` trong HistoryScreen bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <HistoryScreen />
      </Suspense>
    </>
  );
}
