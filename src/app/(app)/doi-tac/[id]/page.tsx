import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChiTietDoiTac } from "@/features/doi-tac/components/chi-tiet-doi-tac";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Chi tiết đối tác" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const nd = await requirePermission("view-catalog");
  const sua = hasPermission(nd.role, "edit-catalog");

  return <ChiTietDoiTac id={id} quyen={{ sua, xemLichSu: sua }} />;
}
