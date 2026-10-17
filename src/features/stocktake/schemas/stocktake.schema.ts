import { z } from "zod";

/** Số mã tối đa của một phiên chọn theo mã — khớp chặn ở database (0131). */
export const MAX_SESSION_PRODUCTS = 2000;

/**
 * `scope` "category": `categoryIds` rỗng = toàn kho. `scope` "products": kiểm đúng
 * các mã trong `productIds` (0129) — phải chọn ít nhất một mã.
 */
export const openSessionSchema = z
  .object({
    warehouseId: z.string().uuid("Chọn kho"),
    scope: z.enum(["category", "products"]),
    categoryIds: z.array(z.string().uuid()),
    // Cùng mức chặn với mo_phien_kiem_ke (0131).
    productIds: z
      .array(z.string().uuid())
      .max(MAX_SESSION_PRODUCTS, "Tối đa 2.000 mã một phiên — nhiều hơn thì chọn theo nhóm hàng"),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.scope !== "products" || v.productIds.length > 0, {
    message: "Chọn ít nhất một mã cần kiểm",
    path: ["productIds"],
  });

export const countQuantitySchema = z
  .number({ message: "Nhập số kiểm" })
  .min(0, "Số kiểm không được âm");

export const voidSessionSchema = z.object({
  reason: z.string().trim().min(3, "Nhập lý do hủy phiên"),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type VoidSessionInput = z.infer<typeof voidSessionSchema>;
