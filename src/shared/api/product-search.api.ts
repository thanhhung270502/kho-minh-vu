import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ProductSearchResult = {
  id: string;
  code: string;
  name: string;
  unitId: string | null;
  conversion: number | null;
  defaultWarehouseId: string | null;
};

export const productSearchKeys = {
  search: (query: string) => ["product-search", query] as const,
};

export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("tim_san_pham", {
    p_tu_khoa: query,
    p_gioi_han: 20,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    unitId: row.dvt_id,
    conversion: row.quy_doi === null ? null : Number(row.quy_doi),
    defaultWarehouseId: row.kho_mac_dinh_id,
  }));
}
