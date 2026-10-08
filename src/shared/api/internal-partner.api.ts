import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isInternalPartnerCode, type PartnerRef } from "@/shared/lib/recipient";

/** Mã người nhận mặc định của đơn / hóa đơn (0119). */
export const DEFAULT_INTERNAL_PARTNER_CODE = "NB001";

export const internalPartnerKeys = { all: ["internal-partners"] as const };

/**
 * Người nhận của đơn đặt và hóa đơn chỉ chọn trong các đối tác nội bộ mã NB…
 * (yêu cầu 08/10/2026); tên người nhận thật gõ tay ở Ghi chú.
 */
export async function fetchInternalPartners(): Promise<PartnerRef[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("doi_tac")
    .select("id, ma, ten")
    .ilike("ma", "NB%")
    .eq("dang_hoat_dong", true)
    .order("ma");
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isInternalPartnerCode(row.ma))
    .map((row) => ({ id: row.id, code: row.ma, name: row.ten }));
}
