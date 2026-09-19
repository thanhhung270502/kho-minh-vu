import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/shared/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Có phiên đăng nhập nhưng hồ sơ nguoi_dung thiếu hoặc bị vô hiệu hóa —
      // đăng xuất để tránh vòng lặp chuyển hướng qua proxy.
      await supabase.auth.signOut();
      redirect("/dang-nhap?loi=vo-hieu-hoa");
    }

    redirect("/dang-nhap");
  }

  // Mật khẩu tạm chỉ dùng để vào đặt mật khẩu riêng, không dùng app (D-03).
  // Đọc cờ từ BẢNG chứ không từ claim: đổi xong là hết chặn ngay, không chờ token mới.
  if (user.mustChangePassword) redirect("/doi-mat-khau");

  return <AppShell user={user}>{children}</AppShell>;
}
