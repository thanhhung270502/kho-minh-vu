import type { Metadata } from "next";

import { Lookups } from "@/features/cai-dat/components/danh-muc-phu";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Kho" };

export default async function Page() {
  await requirePermission("manage-warehouses");

  return <Lookups table="kho" />;
}
