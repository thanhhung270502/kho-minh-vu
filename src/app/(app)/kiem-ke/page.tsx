import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { SessionList } from "@/features/stocktake/components/session-list";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Kiểm kê" };

export default async function StocktakePage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Kiểm kê"
        description="Đếm thực tế, xem lệch, duyệt để đưa tồn về đúng số đã đếm"
      />

      {/* Bộ lọc kho/nhóm hàng của thủ kho siết trong RPC (0066), không ở route —
          cùng cách /ton-kho đã làm ở Phase 5. */}
      <Suspense fallback={null}>
        <SessionList
          canOpen={user.role !== "chi_xem"}
          isStorekeeper={user.role === "thu_kho"}
        />
      </Suspense>
    </>
  );
}
