import type { Metadata } from "next";

import { DocNumberingSettings } from "@/features/settings/components/doc-numbering-settings";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Số chứng từ" };

export default async function Page() {
  await requirePermission("manage-doc-numbering");

  return <DocNumberingSettings />;
}
