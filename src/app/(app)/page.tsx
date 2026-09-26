import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { homePathForRole } from "@/features/dashboard/lib/home-path";

export const metadata: Metadata = { title: "Tổng quan" };

/**
 * D-11: chỉ quản lý xem trang tổng quan thật. Vai trò khác được chuyển thẳng
 * sang màn làm việc chính (`homePathForRole`), không phải `/khong-du-quyen`
 * — nên tự viết guard trực tiếp ở đây thay vì dùng helper chặn quyền chung
 * (helper đó luôn đưa về `/khong-du-quyen`, không role-conditional).
 * Chặn thật ở RPC (0069-0071, lỗi 42501) — đây chỉ là điều hướng (D-12).
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (user.role !== "quan_ly") redirect(homePathForRole(user.role));

  return <DashboardView />;
}
