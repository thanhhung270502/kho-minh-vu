import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

import { toKiotVietHistoryRow, type KiotVietHistoryPage, type KiotVietHistoryRow } from "../types";

type HistoryRpcArgs =
  Database["public"]["Functions"]["tra_cuu_lich_su_kiotviet"]["Args"];

/**
 * RPC `tra_cuu_lich_su_kiotviet` (0064) trả 42501 khi vai trò không có quyền
 * (`xem_duoc_lich_su_kiotviet()` false) — lỗi nổi lên qua `if (error) throw error`
 * rồi `QueryState`/`explainError` tự nhận diện kind "forbidden" (T-06-37).
 */
export async function fetchKiotVietHistory(
  args: HistoryRpcArgs,
): Promise<KiotVietHistoryPage> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "tra_cuu_lich_su_kiotviet",
    args,
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toKiotVietHistoryRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
    totalIn: Number(raw[0]?.tong_nhap ?? 0),
    totalOut: Number(raw[0]?.tong_xuat ?? 0),
  };
}

/** Mở lại nguyên phiếu: cùng RPC, lọc theo loại + số phiếu, lấy tối đa 500 dòng. */
export async function fetchKiotVietVoucher(
  type: "NHAP" | "XUAT",
  voucherNo: string,
): Promise<KiotVietHistoryRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "tra_cuu_lich_su_kiotviet",
    {
      p_loai: type,
      p_so_phieu: voucherNo,
      p_kich_thuoc: 500,
    },
  );
  if (error) throw error;

  return (data ?? []).map(toKiotVietHistoryRow);
}
