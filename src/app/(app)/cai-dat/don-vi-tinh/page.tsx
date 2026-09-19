import type { Metadata } from "next";

import { LookupTable } from "@/features/settings/components/lookup-table";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Đơn vị tính" };

export default async function Page() {
  await requirePermission("manage-lookups");

  return <LookupTable table="don_vi_tinh" />;
}
