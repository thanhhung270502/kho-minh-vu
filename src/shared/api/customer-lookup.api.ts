import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CustomerBrief = { id: string; code: string; name: string };

// Nằm dưới ["partners"] để mọi lần làm mới cache đối tác cũng làm mới ô chọn này.
export const customerLookupKeys = {
  search: (q: string) => ["partners", "customer-lookup", q] as const,
  brief: (id: string) => ["partners", "brief", id] as const,
};

/** Khách hàng đang hoạt động khớp từ khóa — cho ô chọn người nhận ngoài feature đối tác. */
export async function searchActiveCustomers(q: string): Promise<CustomerBrief[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_doi_tac", {
    p_tu_khoa: q || undefined,
    p_loai: "KHACH",
    p_dang_hoat_dong: true,
    p_trang: 1,
    p_kich_thuoc: 20,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, code: row.ma, name: row.ten }));
}

export async function fetchCustomerBrief(id: string): Promise<CustomerBrief | null> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("doi_tac")
    .select("id, ma, ten")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, code: data.ma, name: data.ten } : null;
}
