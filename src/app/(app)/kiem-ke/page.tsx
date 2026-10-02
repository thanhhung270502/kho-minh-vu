import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { can } from "@/shared/lib/permissions";
import { SessionList } from "@/features/stocktake/components/session-list";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Kiểm kho" };

export default async function StocktakePage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Kiểm kho"
        description="Đếm thực tế, xem lệch, duyệt để đưa tồn về đúng số đã đếm"
      />

      {/* Bộ lọc kho/nhóm hàng của thủ kho siết trong RPC (0066), không ở route —
          cùng cách màn tồn kho cũ đã làm ở Phase 5. */}
      <Suspense fallback={null}>
        <SessionList
          canOpen={can(user, "kiem_kho")}
          isStorekeeper={user.role === "thu_kho"}
        />
      </Suspense>
    </>
  );
}
