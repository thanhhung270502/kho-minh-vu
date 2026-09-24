import { z } from "zod";

import { normalizeUsername } from "@/shared/lib/text";

export const ROLES = ["quan_ly", "van_phong", "thu_kho", "chi_xem"] as const;

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
export const userProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ tên"),
    role: z.enum(ROLES),
    warehouseIds: z.array(z.string().uuid()).default([]),
    /** Công tắc quyền theo người (D-13/D-14) — không thuộc PERMISSION_MATRIX. */
    viewKiotVietHistory: z.boolean().default(false),
    approveStocktake: z.boolean().default(false),
  })
  .refine((v) => v.role !== "thu_kho" || v.warehouseIds.length > 0, {
    path: ["warehouseIds"],
    message: "Thủ kho phải được gán ít nhất một kho",
  });

export const createUserSchema = z
  .object({ username, tempPassword: password })
  .and(userProfileSchema);

export const updateUserSchema = z
  .object({ id: z.string().uuid() })
  .and(userProfileSchema);

/**
 * Schema cho FORM giao diện: form sửa không có `id` (id lấy từ dòng bảng) và
 * không có ô mật khẩu. Ghép từ cùng `userProfileSchema` nên luật vai trò/kho
 * chỉ khai một chỗ.
 */
export const createUserFormSchema = createUserSchema;
export const editUserFormSchema = userProfileSchema;

export const resetPasswordSchema = z.object({
  id: z.string().uuid(),
  tempPassword: password,
});

export const changePasswordSchema = z
  .object({ newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hai mật khẩu không khớp",
  });

export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
