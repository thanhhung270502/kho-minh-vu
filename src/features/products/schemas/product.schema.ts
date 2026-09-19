import { z } from "zod";

// KHÔNG dùng `z.coerce.number()`: nó để kiểu đầu vào là `unknown`, làm mọi ô
// `InputNumber` mất kiểu `value`. Ô số của antd đã trả về number|null sẵn.
const nonNegative = (label: string) =>
  z.number({ message: `${label} phải là số` }).min(0, `${label} không được âm`);

export const productSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Nhập mã hàng")
      .max(50, "Mã hàng tối đa 50 ký tự")
      .regex(/^\S+$/, "Mã hàng không chứa khoảng trắng"),
    name: z.string().trim().min(2, "Nhập tên hàng"),
    categoryId: z.string().uuid().nullable(),
    // ĐVT và công đoạn là HAI trường riêng — đây chính là lỗi dữ liệu số 1 của
    // hệ cũ (KiotViet nhét công đoạn vào ô ĐVT). Cả hai đều bắt buộc.
    unitId: z.string({ message: "Chọn đơn vị tính" }).uuid("Chọn đơn vị tính"),
    stageId: z.string({ message: "Chọn công đoạn" }).uuid("Chọn công đoạn"),
    conversion: z
      .number({ message: "Quy đổi phải là số" })
      .gt(0, "Quy đổi phải lớn hơn 0"),
    defaultWarehouseId: z.string().uuid().nullable(),
    minStock: nonNegative("Tồn tối thiểu"),
    maxStock: nonNegative("Tồn tối đa").nullable(),
    salePrice: nonNegative("Giá bán"),
    barcode: z
      .string()
      .trim()
      .max(64, "Barcode tối đa 64 ký tự")
      .nullable()
      .transform((value) => value || null),
    note: z
      .string()
      .trim()
      .nullable()
      .transform((value) => value || null),
    isActive: z.boolean(),
  })
  .refine((value) => value.maxStock === null || value.maxStock >= value.minStock, {
    path: ["maxStock"],
    message: "Tồn tối đa phải ≥ tồn tối thiểu",
  });

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormOutput = z.output<typeof productSchema>;
