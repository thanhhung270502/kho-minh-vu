import type { Database } from "@/types/database.types";

/**
 * Chỉ liệt kê 5 cột client được GRANT SELECT (migration 0068) — không có
 * `khoa_luu`/`khoa_luu_thumb` (CLAUDE.md bẫy 5, D-02 hạn chế đọc thẳng khóa lưu).
 */
type ImageRowDb = Pick<
  Database["public"]["Tables"]["hinh_anh"]["Row"],
  "id" | "san_pham_id" | "la_anh_chinh" | "thu_tu" | "created_at"
>;

export type ProductImage = {
  id: string;
  productId: string;
  isPrimary: boolean;
  order: number;
  createdAt: string;
};

export function toProductImage(row: ImageRowDb): ProductImage {
  return {
    id: row.id,
    productId: row.san_pham_id,
    isPrimary: row.la_anh_chinh,
    order: row.thu_tu,
    createdAt: row.created_at,
  };
}

/** Đúng các cột được grant (0068) — liệt kê tường minh, KHÔNG `select("*")` (bẫy 5). */
export const IMAGE_COLUMNS = "id, san_pham_id, la_anh_chinh, thu_tu, created_at";
