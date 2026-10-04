import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  allows,
  BUSINESS_PERMISSIONS,
  type AnyPermission,
  type BusinessPermission,
  type Role,
} from "@/shared/lib/permissions";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
  /** Mật khẩu hiện tại là mật khẩu tạm do quản lý cấp — phải đổi trước khi dùng app (D-03). */
  mustChangePassword: boolean;
  /**
   * Quyền THEO NGƯỜI (D-13/D-14), không theo vai trò — KHÔNG có trong
   * `PERMISSION_MATRIX` (permissions.ts). Quản lý luôn true, khớp helper SQL
   * `duyet_duoc_kiem_ke()` (0063).
   */
  canApproveStocktake: boolean;
  /** 9 quyền của chức vụ (Phase 16) — đọc từ bảng nên đổi là có hiệu lực ở lần tải trang kế tiếp. */
  permissions: BusinessPermission[];
};

const KNOWN = new Set<string>(BUSINESS_PERMISSIONS.map((p) => p.key));

/**
 * Đọc vai trò từ BẢNG (không từ claim) để giao diện khớp RLS ngay sau khi quản lý đổi quyền.
 *
 * `cache()` gộp các lần gọi trong CÙNG một request (layout + page) — database
 * đặt xa nên mỗi lượt đi về tốn vài trăm ms. Phạm vi cache là một request,
 * không dùng chung giữa người dùng.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Hai truy vấn độc lập (RPC tự lọc theo auth.uid()) — chạy song song thay vì nối tiếp.
  const [profile, grants] = await Promise.all([
    supabase
      .from("nguoi_dung")
      .select(
        "id, ho_ten, vai_tro, dang_hoat_dong, phai_doi_mat_khau, duyet_kiem_ke",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("quyen_cua_toi"),
  ]);

  const { data, error } = profile;
  if (error) throw error;
  if (!data || !data.dang_hoat_dong) return null;

  const { data: granted, error: permissionError } = grants;
  if (permissionError) throw permissionError;

  return {
    id: data.id,
    fullName: data.ho_ten,
    role: data.vai_tro,
    mustChangePassword: data.phai_doi_mat_khau,
    canApproveStocktake: data.vai_tro === "quan_ly" || data.duyet_kiem_ke,
    // RPC trả text[] — chỉ giữ khóa giao diện biết (CHECK 0082 cùng danh sách).
    permissions: (granted ?? []).filter((p): p is BusinessPermission => KNOWN.has(p)),
  };
});

/** Mảng = cần MỘT trong các quyền. */
export async function requirePermission(
  permission: AnyPermission | readonly AnyPermission[],
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/dang-nhap");
  if (!allows(user, permission)) redirect("/khong-du-quyen");

  return user;
}
