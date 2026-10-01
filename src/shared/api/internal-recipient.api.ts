import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type InternalRecipientOption = { id: string; name: string };

export const internalRecipientKeys = {
  all: ["internal-recipients"] as const,
};

/**
 * Qua RPC chứ không đọc thẳng `nguoi_dung`: RLS bảng đó chỉ cho văn phòng
 * thấy hồ sơ của chính mình (0015), còn RPC chỉ lộ id + họ tên (0076).
 */
export async function fetchInternalRecipients(): Promise<InternalRecipientOption[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_nguoi_nhan_noi_bo",
  );
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.ho_ten }));
}
