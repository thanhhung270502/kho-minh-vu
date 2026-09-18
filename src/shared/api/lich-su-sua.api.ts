import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type BangCoNhatKy = "san_pham" | "doi_tac" | "nguoi_dung";
export type DongLichSuSua =
  Database["public"]["Functions"]["lich_su_sua"]["Returns"][number];

export const khoaLichSuSua = (bang: BangCoNhatKy, id: string) =>
  ["lich-su-sua", bang, id] as const;

/** Bảng nhat_ky_sua không cấp quyền đọc cho client — chỉ đi qua RPC có kiểm vai trò. */
export async function layLichSuSua(
  bang: BangCoNhatKy,
  banGhiId: string,
): Promise<DongLichSuSua[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("lich_su_sua", {
    p_bang: bang,
    p_ban_ghi_id: banGhiId,
  });
  if (error) throw error;
  return data ?? [];
}
