import type { Metadata } from "next";

import { DanhMucPhu } from "@/features/cai-dat/components/danh-muc-phu";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Nhóm hàng" };

export default async function Page() {
  await requirePermission("manage-lookups");

  return <DanhMucPhu table="nhom_hang" />;
}
