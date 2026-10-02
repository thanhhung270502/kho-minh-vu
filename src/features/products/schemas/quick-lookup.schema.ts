import { z } from "zod";

import { removeDiacritics } from "@/shared/lib/text";

/**
 * Thêm nhanh nhóm hàng / ĐVT / công đoạn ngay trong form mã hàng (NVPT-04) —
 * chỉ mã + tên. Sửa sâu hơn (nhóm cha, màu công đoạn) ở nút "Danh mục phụ".
 * Khuôn mã khớp form quản lý đầy đủ: chữ không dấu, số, _ và -, tối đa 20 ký tự.
 */
export const quickLookupSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Nhập mã")
    .max(20, "Mã tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ gồm chữ không dấu, số, _ và -")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, "Nhập tên"),
});

export type QuickLookupValues = z.infer<typeof quickLookupSchema>;

/** Gợi ý mã từ tên vừa gõ: "Xi mạ bóng" → "XI_MA_BONG". Người dùng sửa được. */
export function suggestLookupCode(name: string): string {
  return removeDiacritics(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20)
    .replace(/_+$/, "");
}

/** Khóa jsonb/cột database của nhom_hang / don_vi_tinh / cong_doan. */
export function toQuickLookupInsert(values: QuickLookupValues): { ma: string; ten: string } {
  return { ma: values.code, ten: values.name };
}
