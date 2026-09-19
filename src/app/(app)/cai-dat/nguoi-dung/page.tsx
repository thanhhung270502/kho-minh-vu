import type { Metadata } from "next";

import { UserTable } from "@/features/settings/components/user-table";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Người dùng" };

export default async function Page() {
  const nd = await requirePermission("manage-users");

  return <UserTable currentUserId={nd.id} />;
}
