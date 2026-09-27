import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lớp DUY NHẤT phía server chạm tên cột của bảng `hinh_anh` (mapper snake_case
 * ↔ camelCase — CLAUDE.md Bước 2). Route Handler đọc/ghi ảnh chỉ thấy kiểu ở
 * đây, không tự gọi `.from("hinh_anh")` hay `.rpc(...anh...)` ở nơi khác.
 */

export type StoredImageKeys = { backend: string; key: string; thumbKey: string };

export async function fetchImageKeys(id: string): Promise<StoredImageKeys | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("lay_khoa_anh", { p_id: id });
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return { backend: row.noi_luu, key: row.khoa_luu, thumbKey: row.khoa_luu_thumb };
}

export async function fetchProductCode(productId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  // san_pham không có SELECT mức bảng (CLAUDE.md bẫy 5) — chỉ được liệt kê
  // đúng cột đã cấp quyền, cấm select("*").
  const { data, error } = await supabase
    .from("san_pham")
    .select("ma_hang")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;

  return data?.ma_hang ?? null;
}

export async function insertImageRecord(input: {
  id: string;
  productId: string;
  backend: string;
  key: string;
  thumbKey: string;
}): Promise<{ isPrimary: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("them_anh", {
    p_id: input.id,
    p_san_pham_id: input.productId,
    p_noi_luu: input.backend,
    p_khoa_luu: input.key,
    p_khoa_luu_thumb: input.thumbKey,
  });
  if (error) throw error;

  return { isPrimary: data === true };
}

export async function softDeleteImage(id: string): Promise<StoredImageKeys | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("xoa_anh", { p_id: id });
  if (error) {
    // P0002: ảnh đã bị xóa mềm hoặc id không tồn tại — coi như "không còn gì để xóa",
    // không phải lỗi cần báo người dùng (route gọi hàm này tự quyết định 404).
    if (error.code === "P0002") return null;
    throw error;
  }

  const row = data?.[0];
  if (!row) return null;

  return { backend: row.noi_luu, key: row.khoa_luu, thumbKey: row.khoa_luu_thumb };
}
