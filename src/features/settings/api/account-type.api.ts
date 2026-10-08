import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/shared/lib/permissions";

/**
 * Loại tài khoản (0117). Bảng `chuc_vu` chỉ còn giữ "phạm vi" cho JWT và lọc theo
 * kho — giao diện không gọi là chức vụ nữa: Quản lý/Admin, hoặc Nhân viên (mọi kho
 * / chỉ kho được giao). Quyền nghiệp vụ tích theo từng người.
 */
export type AccountTypeCode = "QUAN_LY" | "NHAN_VIEN" | "THU_KHO";

export type AccountType = { id: string; code: AccountTypeCode; scope: Role };

const CODES: AccountTypeCode[] = ["QUAN_LY", "NHAN_VIEN", "THU_KHO"];

export const accountTypeKeys = { all: ["account-types"] as const };

export async function fetchAccountTypes(): Promise<AccountType[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("chuc_vu")
    .select("id, ma, pham_vi")
    .in("ma", CODES);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, code: row.ma as AccountTypeCode, scope: row.pham_vi }));
}
