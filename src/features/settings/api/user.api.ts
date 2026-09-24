import type { QueryData } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Một truy vấn, một kiểu: shape suy từ chính câu select, không viết tay. */
function userQuery() {
  return getSupabaseBrowserClient()
    .from("nguoi_dung")
    .select(
      "id, ho_ten, ten_dang_nhap, vai_tro, dang_hoat_dong, phai_doi_mat_khau, updated_at, xem_lich_su_kiotviet, duyet_kiem_ke, nguoi_dung_kho(kho_id, kho:kho_id(ma, ten))",
    )
    .order("ho_ten");
}

export type UserRow = QueryData<ReturnType<typeof userQuery>>[number];

export const userListKey = ["nguoi-dung"] as const;
export const activeWarehouseKey = ["nguoi-dung", "kho-hoat-dong"] as const;

/** RLS: chỉ quản lý thấy mọi dòng, vai trò khác chỉ thấy chính mình. */
export async function fetchUsers(): Promise<UserRow[]> {
  const { data, error } = await userQuery();
  if (error) throw error;
  return data ?? [];
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
