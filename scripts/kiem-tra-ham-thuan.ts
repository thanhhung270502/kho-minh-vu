/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/kiem-tra-ham-thuan.ts
 */
import assert from "node:assert/strict";

import { boDau, chuanHoaTenDangNhap, tenDangNhapThanhEmail } from "../src/shared/lib/chuan-hoa";
import { coQuyen } from "../src/shared/lib/quyen";
import { tiepTucAnToan } from "../src/shared/lib/tiep-tuc";

assert.equal(boDau("Đặng Thị Ngọc"), "Dang Thi Ngoc");
assert.equal(chuanHoaTenDangNhap("  Kim.Chi "), "kim.chi");
assert.equal(chuanHoaTenDangNhap("Ngọc Ánh"), "ngocanh");
assert.equal(tenDangNhapThanhEmail("thukho1"), "thukho1@khominhvu.local");
assert.equal(
  tenDangNhapThanhEmail("thukho1@khominhvu.local"),
  "thukho1@khominhvu.local",
);

assert.equal(tiepTucAnToan("/danh-muc?nhom=a"), "/danh-muc?nhom=a");
for (const xau of [
  null,
  "",
  "danh-muc",
  "//evil.com",
  "/\\evil.com",
  "https://evil.com",
  "/x://y",
  "/dang-nhap",
]) {
  assert.equal(tiepTucAnToan(xau), "/");
}

assert.equal(coQuyen("thu_kho", "xem_danh_muc"), true);
assert.equal(coQuyen("thu_kho", "sua_danh_muc"), false);
assert.equal(coQuyen("van_phong", "xem_gia_von"), true);
assert.equal(coQuyen("van_phong", "sua_gia_ban"), false);
assert.equal(coQuyen("van_phong", "cai_dat_danh_muc_phu"), true);
assert.equal(coQuyen("van_phong", "cai_dat_nguoi_dung"), false);
assert.equal(coQuyen("chi_xem", "xem_gia_von"), false);

console.log("✓ hàm thuần: tất cả assert đạt");
