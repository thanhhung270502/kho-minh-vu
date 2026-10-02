import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { JobTitleTable } from "@/features/settings/components/job-title-table";

export const metadata: Metadata = { title: "Chức vụ" };

export default async function Page() {
  // Khớp RLS 0082: chỉ phạm vi quản trị (quan_ly) ghi được chuc_vu / chuc_vu_quyen.
  await requirePermission("manage-users");

  return <JobTitleTable />;
}
