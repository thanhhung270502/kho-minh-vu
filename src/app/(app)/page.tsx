import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { homePathFor } from "@/features/dashboard/lib/home-path";
import { can } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Tổng quan" };

/**
 * D-11: chỉ quản lý xem trang tổng quan thật. Vai trò khác được chuyển thẳng
 * sang màn làm việc chính (`homePathFor`), không phải `/khong-du-quyen`
 * — nên tự viết guard trực tiếp ở đây thay vì dùng helper chặn quyền chung
 * (helper đó luôn đưa về `/khong-du-quyen`, không role-conditional).
 * Chặn thật ở RPC (0069-0071, lỗi 42501) — đây chỉ là điều hướng (D-12).
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  // Phase 16: theo quyền "Xem dashboard" của chức vụ (chặn thật ở co_quyen, 0083).
  if (!can(user, "xem_dashboard")) redirect(homePathFor(user));

  return <DashboardView />;
}
