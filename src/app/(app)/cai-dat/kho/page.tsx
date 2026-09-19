import type { Metadata } from "next";

import { LookupTable } from "@/features/settings/components/lookup-table";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Kho" };

export default async function Page() {
  await requirePermission("manage-warehouses");

  return <LookupTable table="kho" />;
}
