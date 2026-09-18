/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/kiem-tra-ham-thuan.ts
 */
import assert from "node:assert/strict";

import { boDau, chuanHoaTenDangNhap, tenDangNhapThanhEmail } from "../src/shared/lib/chuan-hoa";
import { coQuyen } from "../src/shared/lib/quyen";
import { tiepTucAnToan } from "../src/shared/lib/tiep-tuc";
import { goiYTenKhach, tachSoDienThoai } from "../src/features/doi-tac/lib/ghi-chu";
import {
  BO_LOC_MAC_DINH,
  docBoLocTuUrl,
  ghiBoLocRaUrl,
  thamSoRpc,
  type BoLocSanPham,
} from "../src/features/danh-muc/schemas/bo-loc.schema";

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

const boLocMau: BoLocSanPham = {
  q: "op po",
  nhomHangId: "11111111-1111-4111-8111-111111111111",
  congDoanId: null,
  dvtId: null,
  trangThaiTon: "duoi_dinh_muc",
  kinhDoanh: "ngung",
  canRa: true,
  sapXep: "tong_ton",
  huong: "desc",
  trang: 3,
  kichThuoc: 100,
};

assert.deepEqual(docBoLocTuUrl(ghiBoLocRaUrl(boLocMau)), boLocMau, "bộ lọc quay vòng qua URL không mất giá trị");
assert.equal(ghiBoLocRaUrl(BO_LOC_MAC_DINH).toString(), "", "bộ lọc mặc định không ghi gì vào URL");
assert.deepEqual(docBoLocTuUrl(new URLSearchParams("")), BO_LOC_MAC_DINH);
assert.equal(docBoLocTuUrl(new URLSearchParams("trang=-5")).trang, 1, "trang âm về 1");
assert.equal(docBoLocTuUrl(new URLSearchParams("kich_thuoc=99999")).kichThuoc, 200, "kích thước trang bị chặn trần");
assert.equal(docBoLocTuUrl(new URLSearchParams("sap_xep=drop")).sapXep, null, "cột sắp xếp lạ bị bỏ");
assert.equal(docBoLocTuUrl(new URLSearchParams("nhom=khong-phai-uuid")).nhomHangId, null, "nhóm không phải uuid bị bỏ");
assert.equal(
  thamSoRpc({ ...BO_LOC_MAC_DINH, kinhDoanh: "tat_ca" }).p_dang_kinh_doanh,
  null,
  "lọc tất cả gửi null tường minh, không bỏ trống",
);
assert.equal(thamSoRpc(BO_LOC_MAC_DINH).p_dang_kinh_doanh, true);
assert.equal(thamSoRpc({ ...BO_LOC_MAC_DINH, canRa: false }).p_can_ra, undefined);

// Ghi chú KiotViet thật: dòng 1 là tên + địa chỉ, dòng 2 là SĐT.
assert.equal(
  goiYTenKhach("TIẾN DŨNG 602 QUANG TRUNG\nSĐT 0909"),
  "Tiến Dũng 602 Quang Trung",
  "tên đề xuất chỉ lấy dòng đầu, viết hoa chữ cái đầu",
);
assert.equal(
  tachSoDienThoai("HUY HOÀNG 5 \nPHƯỚC HẬU 0966116224"),
  "0966116224",
  "lấy được SĐT nằm ở dòng sau",
);
assert.equal(tachSoDienThoai("NGỌC"), null, "ghi chú không có số thì trả null");

console.log("✓ hàm thuần: tất cả assert đạt");
