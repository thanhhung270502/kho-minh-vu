import { z } from "zod";

import type { Database } from "@/types/database.types";

import { NEGATIVE_REASONS } from "../lib/negative-reasons";

/** KHÔNG dùng z.coerce.number(): InputNumber của antd đã trả number|null (bẫy 11). */
export const documentHeaderSchema = z.object({
  partnerId: z.string().uuid("Chọn nhà cung cấp"),
  warehouseId: z.string().uuid("Chọn kho"),
  docDate: z.string().min(1, "Chọn ngày"),
  source: z.enum(["NCC", "NHA_MAY"]),
  note: z
    .string()
    .trim()
    .nullable()
    .transform((value) => value || null),
});

export const documentLineSchema = z.object({
  productId: z.string().uuid("Chọn mã hàng"),
  quantity: z
    .number({ message: "Số lượng phải là số" })
    .gt(0, "Số lượng phải lớn hơn 0"),
  unitPrice: z
    .number({ message: "Đơn giá phải là số" })
    .min(0, "Đơn giá không được âm"),
  warehouseId: z.string().uuid().nullable(),
});

export type DocumentHeaderInput = z.input<typeof documentHeaderSchema>;
export type DocumentLineInput = z.infer<typeof documentLineSchema>;

type DocumentUpdate = Database["public"]["Tables"]["chung_tu"]["Update"];
type DocumentLineInsert = Database["public"]["Tables"]["chung_tu_dong"]["Insert"];

/** Ranh giới duy nhất đổi khóa miền sang tên cột `chung_tu`. */
export function toDocumentUpdate(
  input: Partial<DocumentHeaderInput>,
): DocumentUpdate {
  const update: DocumentUpdate = {};
  if (input.partnerId !== undefined) update.doi_tac_id = input.partnerId;
  if (input.warehouseId !== undefined) update.kho_id = input.warehouseId;
  if (input.docDate !== undefined) update.ngay_ct = input.docDate;
  if (input.source !== undefined) update.nguon_nhap = input.source;
  if (input.note !== undefined) update.ghi_chu = input.note;
  return update;
}

// --- Lý do xuất âm (D-11) — dùng chung cho `XUAT` (stock-out) và `TRA_NCC` (returns) ---

export const negativeReasonSchema = z
  .object({
    code: z.enum(NEGATIVE_REASONS),
    note: z
      .string()
      .trim()
      .nullable()
      .transform((value) => value || null),
  })
  .superRefine((value, ctx) => {
    if (value.code === "KHAC" && (value.note?.length ?? 0) < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Chọn Khác thì phải ghi rõ lý do",
      });
    }
  });

export type NegativeReasonInput = z.infer<typeof negativeReasonSchema>;

/** Ranh giới duy nhất đổi khóa miền sang tên cột `chung_tu_dong`. */
export function toDocumentLineUpdate(
  input: Partial<DocumentLineInput>,
): Partial<DocumentLineInsert> {
  const update: Partial<DocumentLineInsert> = {};
  if (input.productId !== undefined) update.san_pham_id = input.productId;
  if (input.quantity !== undefined) update.so_luong = input.quantity;
  if (input.unitPrice !== undefined) update.don_gia = input.unitPrice;
  if (input.warehouseId !== undefined) update.kho_id = input.warehouseId;
  return update;
}
