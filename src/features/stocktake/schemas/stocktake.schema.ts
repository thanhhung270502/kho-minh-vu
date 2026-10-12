import { z } from "zod";

/**
 * `scope` "category": `categoryIds` rỗng = toàn kho. `scope` "products": kiểm đúng
 * các mã trong `productIds` (0129) — phải chọn ít nhất một mã.
 */
export const openSessionSchema = z
  .object({
    warehouseId: z.string().uuid("Chọn kho"),
    scope: z.enum(["category", "products"]),
    categoryIds: z.array(z.string().uuid()),
    productIds: z.array(z.string().uuid()),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.scope !== "products" || v.productIds.length > 0, {
    message: "Chọn ít nhất một mã cần kiểm",
    path: ["productIds"],
  });

export const countQuantitySchema = z
  .number({ message: "Nhập số đếm" })
  .min(0, "Số đếm không được âm");

export const voidSessionSchema = z.object({
  reason: z.string().trim().min(3, "Nhập lý do hủy phiên"),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type VoidSessionInput = z.infer<typeof voidSessionSchema>;
