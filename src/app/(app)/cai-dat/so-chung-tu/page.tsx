import type { Metadata } from "next";

import { CauHinhSoCt } from "@/features/cai-dat/components/cau-hinh-so-ct";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Số chứng từ" };

export default async function Page() {
  await requirePermission("manage-doc-numbering");

  return <CauHinhSoCt />;
}
