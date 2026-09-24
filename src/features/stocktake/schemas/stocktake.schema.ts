import { z } from "zod";

/** `categoryIds` rỗng = mở phiên cho toàn kho, không giới hạn nhóm hàng. */
export const openSessionSchema = z.object({
  warehouseId: z.string().uuid("Chọn kho"),
  categoryIds: z.array(z.string().uuid()),
  note: z.string().trim().max(500).optional(),
});

export const countQuantitySchema = z
  .number({ message: "Nhập số đếm" })
  .min(0, "Số đếm không được âm");

export const voidSessionSchema = z.object({
  reason: z.string().trim().min(3, "Nhập lý do hủy phiên"),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type VoidSessionInput = z.infer<typeof voidSessionSchema>;
