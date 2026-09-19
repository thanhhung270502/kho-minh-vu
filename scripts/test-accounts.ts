/**
 * Kiểm schema tài khoản bằng assert thuần — không gọi database, không cần server.
 *
 *   npx tsx scripts/test-accounts.ts
 *
 * Server Action không chạy được ngoài Next.js, nên phần kiểm tự động dừng ở lớp
 * schema; luồng tạo/vô hiệu hóa tài khoản kiểm tay theo 02-VALIDATION.md.
 */
import assert from "node:assert/strict";

import {
  updateUserSchema,
  changePasswordSchema,
  createUserSchema,
} from "../src/features/settings/schemas/user.schema";

const hopLe = {
  fullName: "Nguyễn Văn A",
  role: "van_phong" as const,
  warehouseIds: [],
  username: "Ngọc Ánh",
  tempPassword: "matkhau123",
};

const tao = createUserSchema.safeParse(hopLe);
assert.ok(tao.success, "hồ sơ hợp lệ phải qua được schema");
assert.equal(tao.data.username, "ngocanh", "tên đăng nhập chuẩn hóa bỏ dấu, viết thường");

const thuKhoThieuKho = createUserSchema.safeParse({
  ...hopLe,
  role: "thu_kho",
  username: "kim.chi",
});
assert.ok(!thuKhoThieuKho.success, "thủ kho không kho phải bị chặn");
assert.equal(thuKhoThieuKho.error.issues[0]?.path[0], "warehouseIds");

const matKhauChiSo = createUserSchema.safeParse({ ...hopLe, tempPassword: "12345678" });
assert.ok(!matKhauChiSo.success, "mật khẩu chỉ có số phải bị chặn");

const matKhauNgan = createUserSchema.safeParse({ ...hopLe, tempPassword: "abc123" });
assert.ok(!matKhauNgan.success, "mật khẩu dưới 8 ký tự phải bị chặn");

const capNhat = updateUserSchema.safeParse({
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Nguyễn Văn A",
  role: "thu_kho",
  warehouseIds: ["22222222-2222-4222-8222-222222222222"],
});
assert.ok(capNhat.success, "cập nhật thủ kho có kho phải qua được");

const lechNhau = changePasswordSchema.safeParse({ newPassword: "matkhau123", confirmPassword: "matkhau124" });
assert.ok(!lechNhau.success, "hai mật khẩu khác nhau phải bị chặn");
assert.equal(lechNhau.error.issues[0]?.path[0], "confirmPassword");

console.log("✓ schema tài khoản: tất cả assert đạt");
