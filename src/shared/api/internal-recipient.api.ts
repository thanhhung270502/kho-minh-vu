import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type InternalRecipientOption = {
  id: string;
  name: string;
  shortName: string;
};

export const internalRecipientKeys = {
  all: ["internal-recipients"] as const,
};

/**
 * Người nhận nội bộ = nhân viên phụ trách đang dùng (0077), không phải tài khoản
 * đăng nhập. Qua RPC để chỉ một chỗ quyết định "đang dùng" nghĩa là gì.
 */
export async function fetchInternalRecipients(): Promise<
  InternalRecipientOption[]
> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_nguoi_nhan_noi_bo",
  );
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.ten_day_du,
    shortName: row.ten_viet_tat,
  }));
}

/**
 * Thêm nhân viên phụ trách ngay từ ô chọn người nhận. RLS (0083) chỉ cho người
 * có quyền "Tạo nhân viên" — thiếu quyền thì Postgres trả 42501, ô chọn báo lại.
 */
export async function createInternalRecipient(input: {
  shortName: string;
  fullName: string;
}): Promise<InternalRecipientOption> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("nhan_vien_phu_trach")
    .insert({
      ten_viet_tat: input.shortName,
      ten_day_du: input.fullName,
      dang_dung: true,
    })
    .select("id, ten_viet_tat, ten_day_du")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.ten_day_du, shortName: data.ten_viet_tat };
}
