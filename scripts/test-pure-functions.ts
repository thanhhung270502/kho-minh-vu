/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/test-pure-functions.ts
 */
import assert from "node:assert/strict";

import { removeDiacritics, normalizeUsername, usernameToEmail } from "../src/shared/lib/text";
import { hasPermission } from "../src/shared/lib/permissions";
import { safeRedirectPath } from "../src/shared/lib/redirect-path";
import { suggestCustomerName, extractPhoneNumber } from "../src/features/partners/lib/notes";
import { buildErrorCsv, errorFileName } from "../src/features/products/lib/error-file";
import {
  DEFAULT_RECEIPT_FILTER,
  countActiveReceiptFilters,
  readReceiptFilterFromUrl,
  writeReceiptFilterToUrl,
  toReceiptListRpcArgs,
  type ReceiptFilter,
} from "../src/features/stock-in/schemas/receipt.schema";
import {
  DEFAULT_PRODUCT_FILTER,
  readFilterFromUrl,
  writeFilterToUrl,
  toListRpcArgs,
  type ProductFilter,
} from "../src/features/products/schemas/filter.schema";
import {
  groupLinesByWarehouse,
  UNASSIGNED_WAREHOUSE_LABEL,
} from "../src/features/sales-order/lib/group-lines-by-warehouse";
import type { OrderLine } from "../src/features/sales-order/types";

assert.equal(removeDiacritics("Đặng Thị Ngọc"), "Dang Thi Ngoc");
assert.equal(normalizeUsername("  Kim.Chi "), "kim.chi");
assert.equal(normalizeUsername("Ngọc Ánh"), "ngocanh");
assert.equal(usernameToEmail("thukho1"), "thukho1@khominhvu.local");
assert.equal(
  usernameToEmail("thukho1@khominhvu.local"),
  "thukho1@khominhvu.local",
);

assert.equal(safeRedirectPath("/danh-muc?nhom=a"), "/danh-muc?nhom=a");
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
  assert.equal(safeRedirectPath(xau), "/");
}

assert.equal(hasPermission("thu_kho", "view-catalog"), true);
assert.equal(hasPermission("thu_kho", "edit-catalog"), false);
assert.equal(hasPermission("van_phong", "view-cost"), true);
assert.equal(hasPermission("van_phong", "edit-sale-price"), false);
assert.equal(hasPermission("van_phong", "manage-lookups"), true);
assert.equal(hasPermission("van_phong", "manage-users"), false);
assert.equal(hasPermission("chi_xem", "view-cost"), false);

const sampleFilter: ProductFilter = {
  q: "op po",
  categoryId: "11111111-1111-4111-8111-111111111111",
  stageId: null,
  unitId: null,
  stockStatus: "duoi_dinh_muc",
  tradingStatus: "inactive",
  needsReview: true,
  sortBy: "totalStock",
  sortDir: "desc",
  page: 3,
  pageSize: 100,
};

assert.deepEqual(readFilterFromUrl(writeFilterToUrl(sampleFilter)), sampleFilter, "bộ lọc quay vòng qua URL không mất giá trị");
assert.equal(writeFilterToUrl(DEFAULT_PRODUCT_FILTER).toString(), "", "bộ lọc mặc định không ghi gì vào URL");
assert.deepEqual(readFilterFromUrl(new URLSearchParams("")), DEFAULT_PRODUCT_FILTER);
assert.equal(readFilterFromUrl(new URLSearchParams("trang=-5")).page, 1, "page âm về 1");
assert.equal(readFilterFromUrl(new URLSearchParams("kich_thuoc=99999")).pageSize, 200, "kích thước page bị chặn trần");
assert.equal(readFilterFromUrl(new URLSearchParams("sap_xep=drop")).sortBy, null, "cột sắp xếp lạ bị bỏ");
assert.equal(readFilterFromUrl(new URLSearchParams("nhom=khong-phai-uuid")).categoryId, null, "nhóm không phải uuid bị bỏ");
assert.equal(
  toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, tradingStatus: "all" }).p_dang_kinh_doanh,
  null,
  "lọc tất cả gửi null tường minh, không bỏ trống",
);
assert.equal(toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_dang_kinh_doanh, true);
assert.equal(toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, needsReview: false }).p_can_ra, undefined);

// Ghi chú KiotViet thật: dòng 1 là tên + địa chỉ, dòng 2 là SĐT.
assert.equal(
  suggestCustomerName("TIẾN DŨNG 602 QUANG TRUNG\nSĐT 0909"),
  "Tiến Dũng 602 Quang Trung",
  "tên đề xuất chỉ lấy dòng đầu, viết hoa chữ cái đầu",
);
assert.equal(
  extractPhoneNumber("HUY HOÀNG 5 \nPHƯỚC HẬU 0966116224"),
  "0966116224",
  "lấy được SĐT nằm ở dòng sau",
);
assert.equal(extractPhoneNumber("NGỌC"), null, "ghi chú không có số thì trả null");

// --- Bộ lọc phiếu nhập (Phase 3) -------------------------------------------
const sampleReceiptFilter: ReceiptFilter = {
  q: "PN26",
  status: "HOAN_THANH",
  partnerId: "11111111-1111-4111-8111-111111111111",
  warehouseId: "22222222-2222-4222-8222-222222222222",
  source: "NHA_MAY",
  fromDate: "2026-09-01",
  toDate: "2026-09-30",
  page: 3,
};

assert.deepEqual(
  readReceiptFilterFromUrl(writeReceiptFilterToUrl(sampleReceiptFilter)),
  sampleReceiptFilter,
  "bộ lọc phiếu nhập quay vòng qua URL không mất giá trị",
);
assert.equal(writeReceiptFilterToUrl(DEFAULT_RECEIPT_FILTER).toString(), "", "bộ lọc mặc định không ghi gì vào URL");
assert.deepEqual(readReceiptFilterFromUrl(new URLSearchParams("")), DEFAULT_RECEIPT_FILTER);
assert.equal(readReceiptFilterFromUrl(new URLSearchParams("trang=-2")).page, 1, "page âm về 1");
assert.equal(readReceiptFilterFromUrl(new URLSearchParams("ncc=khong-phai-uuid")).partnerId, null);
assert.equal(readReceiptFilterFromUrl(new URLSearchParams("tu_ngay=01/09/2026")).fromDate, null, "ngày sai định dạng bị bỏ");
assert.equal(countActiveReceiptFilters(DEFAULT_RECEIPT_FILTER), 0, "không điều kiện nào thì đếm 0");
assert.equal(countActiveReceiptFilters(sampleReceiptFilter), 5, "khoảng ngày tính là MỘT điều kiện");
assert.equal(
  countActiveReceiptFilters({ ...DEFAULT_RECEIPT_FILTER, q: "tìm gì đó" }),
  0,
  "ô tìm KHÔNG tính vào số điều kiện của panel lọc",
);
assert.equal(toReceiptListRpcArgs(DEFAULT_RECEIPT_FILTER).p_loai_ct, "NHAP", "màn phiếu nhập luôn khóa loại NHAP");

// --- Nhóm dòng theo kho cho phiếu đi lấy hàng (04-12, D-09) -----------------
function sampleOrderLine(overrides: Partial<OrderLine>): OrderLine {
  return {
    id: overrides.id ?? "line-1",
    productId: "product-1",
    productCode: "MA-001",
    productName: "Sản phẩm mẫu",
    unitName: "Cái",
    orderedQuantity: 1,
    shippedQuantity: 0,
    remainingQuantity: 1,
    defaultWarehouseId: "kho-1",
    defaultWarehouseName: "Kho 1",
    createdAt: "2026-09-20T00:00:00Z",
    ...overrides,
  };
}

const groupedRows = groupLinesByWarehouse([
  sampleOrderLine({ id: "b-kho2", productCode: "B002", defaultWarehouseId: "k2", defaultWarehouseName: "Kho 2" }),
  sampleOrderLine({ id: "a-kho1", productCode: "A002", defaultWarehouseId: "k1", defaultWarehouseName: "Kho 1" }),
  sampleOrderLine({ id: "c-khong-kho", productCode: "C003", defaultWarehouseId: null, defaultWarehouseName: null }),
  sampleOrderLine({ id: "d-kho1", productCode: "A001", defaultWarehouseId: "k1", defaultWarehouseName: "Kho 1" }),
]);

// Thứ tự mong đợi: nhóm "Kho 1" (mã A001 rồi A002), nhóm "Kho 2" (B002), nhóm
// "Chưa gán kho" (C003) ở cuối cùng — dù thứ tự đầu vào ngược lại hoàn toàn.
assert.deepEqual(
  groupedRows.map((row) => (row.kind === "group" ? `nhom:${row.warehouseName}` : row.line.id)),
  ["nhom:Kho 1", "d-kho1", "a-kho1", "nhom:Kho 2", "b-kho2", `nhom:${UNASSIGNED_WAREHOUSE_LABEL}`, "c-khong-kho"],
  "gom nhóm theo kho rồi theo mã hàng, mã thiếu kho mặc định gom nhóm cuối",
);
assert.deepEqual(
  groupedRows.filter((row) => row.kind === "line").map((row) => row.index),
  [1, 2, 3, 4],
  "STT liên tục trong cả tờ, không đánh lại từ 1 ở mỗi kho",
);

// tsx biên dịch ra CJS nên KHÔNG có top-level await — bọc phần bất đồng bộ lại.
async function kiemCsvLoi() {
  // CSV lỗi: Excel trên Windows cần BOM, và dấu nháy trong thông báo phải nhân đôi.
  const blob = buildErrorCsv([
    { row: 12, column: "dvt", message: 'Không có đơn vị tính "Thùng", kiểm tra' },
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
  assert.equal(errorFileName("danh-muc-20260918-1030.xlsx"), "danh-muc-20260918-1030-loi.csv");
}

void kiemCsvLoi().then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});
