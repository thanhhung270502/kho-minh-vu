import { z } from "zod";

const rongThanhNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const doiTacSchema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Nhập mã đối tác")
    .max(32, "Mã tối đa 32 ký tự")
    .regex(/^[A-Za-z0-9._-]+$/, "Mã chỉ gồm chữ không dấu, số và . _ -")
    .transform((v) => v.toUpperCase()),
  ten: z.string().trim().min(2, "Nhập tên đối tác"),
  loai: z.enum(["NCC", "KHACH", "CA_HAI"]),
  dien_thoai: z
    .string()
    .trim()
    .max(20, "Số điện thoại tối đa 20 ký tự")
    .regex(/^[0-9 +().-]*$/, "Số điện thoại chỉ gồm số và + ( ) . -")
    .optional()
    .transform(rongThanhNull),
  email: z
    .union([z.literal(""), z.string().trim().email("Email không hợp lệ")])
    .optional()
    .transform(rongThanhNull),
  dia_chi: z.string().trim().optional().transform(rongThanhNull),
  khu_vuc: z.string().trim().optional().transform(rongThanhNull),
  ma_so_thue: z.string().trim().max(20).optional().transform(rongThanhNull),
  ghi_chu: z.string().trim().optional().transform(rongThanhNull),
  dang_hoat_dong: z.boolean(),
});

export type DoiTacForm = z.input<typeof doiTacSchema>;
export type DoiTacLuu = z.output<typeof doiTacSchema>;
