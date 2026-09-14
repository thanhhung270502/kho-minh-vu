import { z } from "zod";

export const dangNhapSchema = z.object({
  tenDangNhap: z.string().trim().min(1, "Nhập tên đăng nhập"),
  matKhau: z.string().min(1, "Nhập mật khẩu"),
});

export type DangNhapInput = z.infer<typeof dangNhapSchema>;
