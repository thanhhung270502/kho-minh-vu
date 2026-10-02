import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { StaffTable } from "@/features/settings/components/staff-table";

export const metadata: Metadata = { title: "Nhân viên phụ trách" };

export default async function Page() {
  // Khớp RLS 0083: quyền chức vụ "Tạo nhân viên" ghi được nhan_vien_phu_trach.
  await requirePermission("tao_nhan_vien");

  return <StaffTable />;
}
