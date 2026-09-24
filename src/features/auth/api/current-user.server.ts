import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission, type Permission, type Role } from "@/shared/lib/permissions";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
  /** Mật khẩu hiện tại là mật khẩu tạm do quản lý cấp — phải đổi trước khi dùng app (D-03). */
  mustChangePassword: boolean;
  /**
   * Quyền THEO NGƯỜI (D-13/D-14), không theo vai trò — KHÔNG có trong
   * `PERMISSION_MATRIX` (permissions.ts). Quản lý luôn true, khớp helper SQL
   * `xem_duoc_lich_su_kiotviet()`/`duyet_duoc_kiem_ke()` (0063).
   */
  canViewKiotVietHistory: boolean;
  canApproveStocktake: boolean;
};

/** Đọc vai trò từ BẢNG (không từ claim) để giao diện khớp RLS ngay sau khi quản lý đổi quyền. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("nguoi_dung")
    .select(
      "id, ho_ten, vai_tro, dang_hoat_dong, phai_doi_mat_khau, xem_lich_su_kiotviet, duyet_kiem_ke",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.dang_hoat_dong) return null;

  return {
    id: data.id,
    fullName: data.ho_ten,
    role: data.vai_tro,
    mustChangePassword: data.phai_doi_mat_khau,
    canViewKiotVietHistory: data.vai_tro === "quan_ly" || data.xem_lich_su_kiotviet,
    canApproveStocktake: data.vai_tro === "quan_ly" || data.duyet_kiem_ke,
  };
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/dang-nhap");
  if (!hasPermission(user.role, permission)) redirect("/khong-du-quyen");

  return user;
}

/**
 * Chặn theo quyền THEO NGƯỜI (D-13), không phải theo `Permission`/`Role` tĩnh —
 * dùng cho route "Lịch sử KiotViet". Chặn thật ở RLS/RPC (migration 0064).
 */
export async function requireKiotVietHistoryAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/dang-nhap");
  if (!user.canViewKiotVietHistory) redirect("/khong-du-quyen");

  return user;
}
