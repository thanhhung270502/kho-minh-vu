import type { Metadata } from "next";

import { UserTable } from "@/features/settings/components/user-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { can, isAdmin } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Người dùng" };

export default async function Page() {
  const nd = await requirePermission(["tao_tai_khoan", "phan_quyen"]);

  // Chỉ để ẩn/hiện nút — server action và RPC kiểm lại (0117).
  const access = {
    isAdmin: isAdmin(nd),
    canProfile: can(nd, "tao_tai_khoan"),
    canAssign: can(nd, "phan_quyen"),
  };

  return <UserTable currentUserId={nd.id} access={access} />;
}
