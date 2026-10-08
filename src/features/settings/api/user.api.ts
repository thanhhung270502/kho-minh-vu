import type { QueryData } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BUSINESS_PERMISSIONS, type BusinessPermission } from "@/shared/lib/permissions";

/** Một truy vấn, một kiểu: shape suy từ chính câu select, không viết tay. */
function userQuery() {
  return getSupabaseBrowserClient()
    .from("nguoi_dung")
    .select(
      "id, ho_ten, ten_dang_nhap, vai_tro, chuc_vu_id, chuc_vu(ten), dang_hoat_dong, phai_doi_mat_khau, updated_at, duyet_kiem_ke, nguoi_dung_kho(kho_id, kho:kho_id(ma, ten))",
    )
    .order("ho_ten");
}

type UserRowDb = QueryData<ReturnType<typeof userQuery>>[number];
/** Quyền tích theo người (0117) — Admin luôn đủ nên danh sách rỗng là bình thường. */
export type UserRow = UserRowDb & { permissions: BusinessPermission[] };

const KNOWN = new Set<string>(BUSINESS_PERMISSIONS.map((p) => p.key));

export const userListKey = ["nguoi-dung"] as const;
export const activeWarehouseKey = ["nguoi-dung", "kho-hoat-dong"] as const;

/**
 * RLS: Admin và người có quyền Tạo tài khoản / Phân quyền thấy mọi dòng (0117).
 * Bảng quyền không có khóa ngoại nên không nhúng được trong một select — đọc riêng rồi ghép.
 */
export async function fetchUsers(): Promise<UserRow[]> {
  const supabase = getSupabaseBrowserClient();
  const [users, grants] = await Promise.all([
    userQuery(),
    supabase.from("nguoi_dung_quyen").select("nguoi_dung_id, quyen"),
  ]);
  if (users.error) throw users.error;
  if (grants.error) throw grants.error;
  const byUser = new Map<string, BusinessPermission[]>();
  for (const g of grants.data ?? []) {
    if (!KNOWN.has(g.quyen)) continue;
    byUser.set(g.nguoi_dung_id, [...(byUser.get(g.nguoi_dung_id) ?? []), g.quyen as BusinessPermission]);
  }
  return (users.data ?? []).map((u) => ({ ...u, permissions: byUser.get(u.id) ?? [] }));
}

export async function fetchActiveWarehouses(): Promise<Array<{ id: string; ma: string; ten: string }>> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("kho")
    .select("id, ma, ten")
    .eq("dang_hoat_dong", true)
    .order("ma");
  if (error) throw error;
  return data ?? [];
}

export function userWarehouses(nd: UserRow): Array<{ id: string; ten: string }> {
  return (nd.nguoi_dung_kho ?? []).map((k) => ({
    id: k.kho_id,
    ten: k.kho?.ten ?? k.kho_id,
  }));
}
