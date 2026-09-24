import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { SessionDetail } from "@/features/stocktake/components/session-detail";

export const metadata: Metadata = { title: "Phiên kiểm kê" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("view-catalog");

  return (
    <Suspense>
      <SessionDetail
        sessionId={id}
        canCount={user.role !== "chi_xem"}
        canApprove={user.canApproveStocktake}
      />
    </Suspense>
  );
}
