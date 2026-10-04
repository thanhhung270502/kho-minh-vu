import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

import { toProductKind, type ComboComponent, type ProductKind } from "../types";

export async function fetchComboComponents(comboId: string): Promise<ComboComponent[]> {
  // Hai khóa ngoại cùng trỏ san_pham — chỉ định cột thanh_phan_id cho phép nhúng.
  const { data, error } = await getSupabaseBrowserClient()
    .from("thanh_phan_combo")
    .select("thanh_phan_id, so_luong, san_pham!thanh_phan_id(ma_hang, ten_hang, don_vi_tinh(ten))")
    .eq("combo_id", comboId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    productId: row.thanh_phan_id,
    code: row.san_pham.ma_hang,
    name: row.san_pham.ten_hang,
    unitName: row.san_pham.don_vi_tinh?.ten ?? null,
    quantity: Number(row.so_luong),
  }));
}

/**
 * Loại hàng + ĐVT của mã sắp thêm vào combo — kết quả tìm mã dùng chung không
 * mang hai thứ này. Liệt kê cột (bẫy 5: san_pham chỉ cấp SELECT theo cột).
 */
export async function fetchComponentCandidate(
  productId: string,
): Promise<{ kind: ProductKind; unitName: string | null }> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("san_pham")
    .select("loai_hang, don_vi_tinh(ten)")
    .eq("id", productId)
    .single();
  if (error) throw error;
  return { kind: toProductKind(data.loai_hang), unitName: data.don_vi_tinh?.ten ?? null };
}

/** Thay TOÀN BỘ thành phần của combo. Trả số thành phần đã lưu. */
export async function saveComboComponents(
  comboId: string,
  items: ReadonlyArray<Pick<ComboComponent, "productId" | "quantity">>,
): Promise<number> {
  // Khóa snake_case là hợp đồng jsonb của RPC luu_thanh_phan_combo (0088).
  const payload = items.map((i) => ({ thanh_phan_id: i.productId, so_luong: i.quantity }));
  const { data, error } = await getSupabaseBrowserClient().rpc("luu_thanh_phan_combo", {
    p_combo_id: comboId,
    p_thanh_phan: payload as Json,
  });
  if (error) throw error;
  return data ?? 0;
}
