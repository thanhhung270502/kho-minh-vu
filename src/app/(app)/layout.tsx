import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { layNguoiDungHienTai } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/shared/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const nd = await layNguoiDungHienTai();

  if (!nd) {
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

  return <AppShell nguoiDung={nd}>{children}</AppShell>;
}
