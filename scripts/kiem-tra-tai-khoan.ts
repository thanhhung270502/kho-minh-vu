/**
 * Kiểm schema tài khoản bằng assert thuần — không gọi database, không cần server.
 *
 *   npx tsx scripts/kiem-tra-tai-khoan.ts
 *
 * Server Action không chạy được ngoài Next.js, nên phần kiểm tự động dừng ở lớp
 * schema; luồng tạo/vô hiệu hóa tài khoản kiểm tay theo 02-VALIDATION.md.
 */
import assert from "node:assert/strict";

import {
  capNhatNguoiDungSchema,
  doiMatKhauSchema,
  taoNguoiDungSchema,
} from "../src/features/cai-dat/schemas/nguoi-dung.schema";

const hopLe = {
  hoTen: "Nguyễn Văn A",
  vaiTro: "van_phong" as const,
  khoIds: [],
  tenDangNhap: "Ngọc Ánh",
  matKhauTam: "matkhau123",
};

const tao = taoNguoiDungSchema.safeParse(hopLe);
assert.ok(tao.success, "hồ sơ hợp lệ phải qua được schema");
assert.equal(tao.data.tenDangNhap, "ngocanh", "tên đăng nhập chuẩn hóa bỏ dấu, viết thường");

const thuKhoThieuKho = taoNguoiDungSchema.safeParse({
  ...hopLe,
  vaiTro: "thu_kho",
  tenDangNhap: "kim.chi",
});
assert.ok(!thuKhoThieuKho.success, "thủ kho không kho phải bị chặn");
assert.equal(thuKhoThieuKho.error.issues[0]?.path[0], "khoIds");

const matKhauChiSo = taoNguoiDungSchema.safeParse({ ...hopLe, matKhauTam: "12345678" });
assert.ok(!matKhauChiSo.success, "mật khẩu chỉ có số phải bị chặn");

const matKhauNgan = taoNguoiDungSchema.safeParse({ ...hopLe, matKhauTam: "abc123" });
assert.ok(!matKhauNgan.success, "mật khẩu dưới 8 ký tự phải bị chặn");

const capNhat = capNhatNguoiDungSchema.safeParse({
  id: "11111111-1111-4111-8111-111111111111",
  hoTen: "Nguyễn Văn A",
  vaiTro: "thu_kho",
  khoIds: ["22222222-2222-4222-8222-222222222222"],
});
assert.ok(capNhat.success, "cập nhật thủ kho có kho phải qua được");

const lechNhau = doiMatKhauSchema.safeParse({ matKhauMoi: "matkhau123", nhapLai: "matkhau124" });
assert.ok(!lechNhau.success, "hai mật khẩu khác nhau phải bị chặn");
assert.equal(lechNhau.error.issues[0]?.path[0], "nhapLai");

console.log("✓ schema tài khoản: tất cả assert đạt");
