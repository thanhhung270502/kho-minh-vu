import type { Metadata } from "next";

import { LookupTable } from "@/features/settings/components/lookup-table";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Công đoạn" };

export default async function Page() {
  await requirePermission("manage-lookups");

  return <LookupTable table="cong_doan" />;
}
