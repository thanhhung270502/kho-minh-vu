import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type InternalRecipientOption = { id: string; name: string; shortName: string };

export const internalRecipientKeys = {
  all: ["internal-recipients"] as const,
};

/**
 * Người nhận nội bộ = nhân viên phụ trách đang dùng (0077), không phải tài khoản
 * đăng nhập. Qua RPC để chỉ một chỗ quyết định "đang dùng" nghĩa là gì.
 */
export async function fetchInternalRecipients(): Promise<InternalRecipientOption[]> {
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
