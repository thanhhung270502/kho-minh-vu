import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { firstTabForRole } from "@/features/settings/lib/settings-tabs";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const nd = await requirePermission("manage-lookups");

  // /cai-dat không có nội dung riêng — đưa thẳng tới tab đầu tiên người này vào được.
  redirect(firstTabForRole(nd.role));
}
