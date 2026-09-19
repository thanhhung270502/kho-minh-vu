import type { Metadata } from "next";

import { BangNguoiDung } from "@/features/cai-dat/components/bang-nguoi-dung";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "Người dùng" };

export default async function Page() {
  const nd = await requirePermission("manage-users");

  return <BangNguoiDung nguoiDungHienTaiId={nd.id} />;
}
