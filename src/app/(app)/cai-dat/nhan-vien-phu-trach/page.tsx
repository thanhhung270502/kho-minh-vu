import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { StaffTable } from "@/features/settings/components/staff-table";

export const metadata: Metadata = { title: "Nhân viên phụ trách" };

export default async function Page() {
  // 0117: chỉ Quản lý/Admin quản lý nhân viên phụ trách.
  await requirePermission("manage-users");

  return <StaffTable />;
}
