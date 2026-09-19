import { z } from "zod";

import { normalizeUsername } from "@/shared/lib/text";

export const VAI_TRO = ["quan_ly", "van_phong", "thu_kho", "chi_xem"] as const;

const username = z
  .string()
  .trim()
  .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
  .max(32, "Tên đăng nhập tối đa 32 ký tự")
  .transform(normalizeUsername)
  .refine(
    (v) => /^[a-z0-9._-]{3,32}$/.test(v),
    "Chỉ dùng chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang",
  );

const password = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất một chữ")
  .regex(/[0-9]/, "Mật khẩu phải có ít nhất một số");

/** Phần hồ sơ dùng chung cho cả tạo, sửa và form giao diện. */
export const hoSoNguoiDungSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ tên"),
    role: z.enum(VAI_TRO),
    khoIds: z.array(z.string().uuid()).default([]),
  })
  .refine((v) => v.role !== "thu_kho" || v.khoIds.length > 0, {
    path: ["khoIds"],
    message: "Thủ kho phải được gán ít nhất một kho",
  });

export const taoNguoiDungSchema = z
  .object({ username, tempPassword: password })
  .and(hoSoNguoiDungSchema);

export const capNhatNguoiDungSchema = z
  .object({ id: z.string().uuid() })
  .and(hoSoNguoiDungSchema);

/**
 * Schema cho FORM giao diện: form sửa không có `id` (id lấy từ dòng bảng) và
 * không có ô mật khẩu. Ghép từ cùng `hoSoNguoiDungSchema` nên luật vai trò/kho
 * chỉ khai một chỗ.
 */
export const formTaoNguoiDungSchema = taoNguoiDungSchema;
export const formSuaNguoiDungSchema = hoSoNguoiDungSchema;

export const datLaiMatKhauSchema = z.object({
  id: z.string().uuid(),
  tempPassword: password,
});

export const changePasswordSchema = z
  .object({ newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hai mật khẩu không khớp",
  });

export type TaoNguoiDungInput = z.input<typeof taoNguoiDungSchema>;
export type CapNhatNguoiDungInput = z.input<typeof capNhatNguoiDungSchema>;
export type DatLaiMatKhauInput = z.input<typeof datLaiMatKhauSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
