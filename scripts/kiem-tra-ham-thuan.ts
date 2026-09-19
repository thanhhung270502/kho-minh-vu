/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/kiem-tra-ham-thuan.ts
 */
import assert from "node:assert/strict";

import { boDau, chuanHoaTenDangNhap, tenDangNhapThanhEmail } from "../src/shared/lib/chuan-hoa";
import { coQuyen } from "../src/shared/lib/quyen";
import { tiepTucAnToan } from "../src/shared/lib/tiep-tuc";
import { goiYTenKhach, tachSoDienThoai } from "../src/features/doi-tac/lib/ghi-chu";
import { taoCsvLoi, tenFileLoi } from "../src/features/danh-muc/lib/file-loi";
import {
  BO_LOC_PHIEU_MAC_DINH,
  demDieuKienPhieu,
  docBoLocPhieu,
  ghiBoLocPhieu,
  thamSoRpcPhieu,
  type BoLocPhieu,
} from "../src/features/nhap-kho/schemas/phieu-nhap.schema";
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

// --- Bộ lọc phiếu nhập (Phase 3) -------------------------------------------
const boLocPhieu: BoLocPhieu = {
  q: "PN26",
  trangThai: "HOAN_THANH",
  doiTacId: "11111111-1111-4111-8111-111111111111",
  khoId: "22222222-2222-4222-8222-222222222222",
  nguonNhap: "NHA_MAY",
  tuNgay: "2026-09-01",
  denNgay: "2026-09-30",
  trang: 3,
};

assert.deepEqual(
  docBoLocPhieu(ghiBoLocPhieu(boLocPhieu)),
  boLocPhieu,
  "bộ lọc phiếu nhập quay vòng qua URL không mất giá trị",
);
assert.equal(ghiBoLocPhieu(BO_LOC_PHIEU_MAC_DINH).toString(), "", "bộ lọc mặc định không ghi gì vào URL");
assert.deepEqual(docBoLocPhieu(new URLSearchParams("")), BO_LOC_PHIEU_MAC_DINH);
assert.equal(docBoLocPhieu(new URLSearchParams("trang=-2")).trang, 1, "trang âm về 1");
assert.equal(docBoLocPhieu(new URLSearchParams("ncc=khong-phai-uuid")).doiTacId, null);
assert.equal(docBoLocPhieu(new URLSearchParams("tu_ngay=01/09/2026")).tuNgay, null, "ngày sai định dạng bị bỏ");
assert.equal(demDieuKienPhieu(BO_LOC_PHIEU_MAC_DINH), 0, "không điều kiện nào thì đếm 0");
assert.equal(demDieuKienPhieu(boLocPhieu), 5, "khoảng ngày tính là MỘT điều kiện");
assert.equal(
  demDieuKienPhieu({ ...BO_LOC_PHIEU_MAC_DINH, q: "tìm gì đó" }),
  0,
  "ô tìm KHÔNG tính vào số điều kiện của panel lọc",
);
assert.equal(thamSoRpcPhieu(BO_LOC_PHIEU_MAC_DINH).p_loai_ct, "NHAP", "màn phiếu nhập luôn khóa loại NHAP");

// tsx biên dịch ra CJS nên KHÔNG có top-level await — bọc phần bất đồng bộ lại.
async function kiemCsvLoi() {
  // CSV lỗi: Excel trên Windows cần BOM, và dấu nháy trong thông báo phải nhân đôi.
  const blob = taoCsvLoi([
    { dong: 12, cot: "dvt", thong_bao: 'Không có đơn vị tính "Thùng", kiểm tra' },
  ]);

  // Kiểm BYTE chứ không kiểm chuỗi: `blob.text()` giải mã UTF-8 theo chuẩn
  // WHATWG và chuẩn đó NUỐT BOM. Thứ Excel đọc là byte tải về, nên phải soi byte.
  const byte = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual(
    [...byte.slice(0, 3)],
    [0xef, 0xbb, 0xbf],
    "CSV mở đầu bằng BOM UTF-8 để Excel đọc đúng tiếng Việt",
  );

  const csv = await blob.text();
  assert.ok(
    csv.includes('"Không có đơn vị tính ""Thùng"", kiểm tra"'),
    "nháy kép trong thông báo được nhân đôi",
  );
  assert.ok(csv.includes("Đơn vị tính"), "tên cột hiển thị bằng tiêu đề tiếng Việt");
  assert.equal(tenFileLoi("danh-muc-20260918-1030.xlsx"), "danh-muc-20260918-1030-loi.csv");
}

void kiemCsvLoi().then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});
