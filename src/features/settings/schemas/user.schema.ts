import { z } from "zod";

import { BUSINESS_PERMISSIONS, type BusinessPermission } from "@/shared/lib/permissions";
import { normalizeUsername } from "@/shared/lib/text";

const PERMISSION_KEYS = BUSINESS_PERMISSIONS.map((p) => p.key) as [BusinessPermission, ...BusinessPermission[]];

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
    /** Loại tài khoản (chuc_vu: QUAN_LY / NHAN_VIEN / THU_KHO — 0117). */
    jobTitleId: z.string({ message: "Chọn loại tài khoản" }).uuid("Chọn loại tài khoản"),
    /** Phạm vi của loại đang chọn — form tự điền, chỉ dùng để kiểm luật kho. */
    role: z.enum(ROLES),
    warehouseIds: z.array(z.string().uuid()).default([]),
    /** Cờ cũ (0063) — kiểm kho nay chỉ Admin; giữ để truyền lại giá trị đang có. */
    approveStocktake: z.boolean().default(false),
    /** 9 quyền tích theo người (0117); bỏ qua khi là Admin. */
    permissions: z.array(z.enum(PERMISSION_KEYS)).default([]),
  })
  .refine((v) => v.role !== "thu_kho" || v.warehouseIds.length > 0, {
    path: ["warehouseIds"],
    message: "Chọn ít nhất một kho được vào",
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
