/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/test-pure-functions.ts
 */
import assert from "node:assert/strict";

import { removeDiacritics, normalizeUsername, usernameToEmail, labelMatches } from "../src/shared/lib/text";
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
  DEFAULT_INVENTORY_FILTER,
  countActiveInventoryFilters,
  readInventoryFilterFromUrl,
  writeInventoryFilterToUrl,
  toInventoryRpcArgs,
  type InventoryFilter,
} from "../src/features/inventory/schemas/inventory.schema";
import {
  groupLinesByWarehouse,
  UNASSIGNED_WAREHOUSE_LABEL,
} from "../src/features/sales-order/lib/group-lines-by-warehouse";
import type { OrderLine } from "../src/features/sales-order/types";
import { toKiotVietHistoryRow } from "../src/features/kiotviet-history/types";
import {
  discrepancyOf,
  isLargeDiscrepancy,
} from "../src/features/stocktake/lib/discrepancy";
import {
  sessionStatus,
  SESSION_STATUS_LABELS,
} from "../src/features/stocktake/lib/session-status";
import {
  DEFAULT_HISTORY_FILTER,
  countActiveHistoryFilters,
  readHistoryFilterFromUrl,
  writeHistoryFilterToUrl,
  toHistoryRpcArgs,
  type KiotVietHistoryFilter,
} from "../src/features/kiotviet-history/schemas/history-filter.schema";
import {
  filterNavItems,
  splitMobileItems,
  NAV_ITEMS,
} from "../src/shared/lib/navigation";
import { homePathForRole } from "../src/features/dashboard/lib/home-path";
import {
  buildInventoryDrilldownUrl,
  type StockGroupBy,
} from "../src/features/dashboard/lib/stock-drilldown";
import {
  countNegativeByReason,
  compareSalesPace,
} from "../src/features/dashboard/lib/dashboard-stats";

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

// --- Trang chủ theo vai trò + quyền "view-dashboard" (Phase 7, 07-04) -----
assert.equal(homePathForRole("quan_ly"), "/");
assert.equal(homePathForRole("van_phong"), "/xuat-kho");
assert.equal(homePathForRole("thu_kho"), "/ton-kho");
assert.equal(homePathForRole("chi_xem"), "/ton-kho");

assert.equal(hasPermission("quan_ly", "view-dashboard"), true);
assert.equal(hasPermission("van_phong", "view-dashboard"), false);
assert.equal(hasPermission("thu_kho", "view-dashboard"), false);
assert.equal(hasPermission("chi_xem", "view-dashboard"), false);

// filterNavItems (06-16): menu "Kiểm kê" cho mọi vai trò, "Lịch sử KiotViet"
// ẩn hẳn khi chưa bật công tắc theo người (D-13).
{
  const thuKhoItems = filterNavItems(
    { role: "thu_kho", canViewKiotVietHistory: false },
    NAV_ITEMS,
  );
  assert.ok(
    thuKhoItems.some((i) => i.href === "/kiem-ke"),
    "thủ kho thấy /kiem-ke",
  );
  assert.ok(
    !thuKhoItems.some((i) => i.href === "/lich-su-kiotviet"),
    "thủ kho chưa bật công tắc thì KHÔNG thấy /lich-su-kiotviet",
  );
  assert.ok(
    !thuKhoItems.some((i) => i.href === "/"),
    "thủ kho không có quyền view-dashboard nên không thấy mục Tổng quan (07-04)",
  );

  const vanPhongItems = filterNavItems(
    { role: "van_phong", canViewKiotVietHistory: true },
    NAV_ITEMS,
  );
  assert.ok(
    vanPhongItems.some((i) => i.href === "/kiem-ke") &&
      vanPhongItems.some((i) => i.href === "/lich-su-kiotviet"),
    "văn phòng đã bật công tắc thấy cả hai mục mới",
  );
  assert.ok(
    !vanPhongItems.some((i) => i.href === "/"),
    "văn phòng không thấy mục Tổng quan",
  );

  const quanLyItems = filterNavItems(
    { role: "quan_ly", canViewKiotVietHistory: true },
    NAV_ITEMS,
  );
  assert.ok(
    quanLyItems.some((i) => i.href === "/kiem-ke") &&
      quanLyItems.some((i) => i.href === "/lich-su-kiotviet") &&
      quanLyItems.some((i) => i.href === "/cai-dat") &&
      quanLyItems.some((i) => i.href === "/"),
    "quản lý thấy cả hai mục mới cộng /cai-dat và Tổng quan",
  );

  const chiXemItems = filterNavItems(
    { role: "chi_xem", canViewKiotVietHistory: false },
    NAV_ITEMS,
  );
  assert.ok(
    chiXemItems.some((i) => i.href === "/kiem-ke") &&
      !chiXemItems.some((i) => i.href === "/cai-dat"),
    "chỉ xem thấy /kiem-ke nhưng không thấy /cai-dat",
  );
  assert.ok(
    !chiXemItems.some((i) => i.href === "/"),
    "chỉ xem không thấy mục Tổng quan",
  );

  const { primary } = splitMobileItems(thuKhoItems);
  assert.ok(
    !primary.some((i) => i.href === "/"),
    "thanh tab đáy của thủ kho không còn ô Tổng quan trỏ vòng (07-04, mất quyền view-dashboard)",
  );
  assert.deepEqual(
    primary.map((i) => i.href),
    ["/xuat-kho", "/nhap-kho", "/ton-kho", "/dat-hang"],
    "mất ô Tổng quan thì mục ưu tiên 5 (Đặt hàng) đôn lên lấp đủ 4 ô",
  );
}

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

// --- Bộ lọc màn tồn kho (Phase 5, 05-06) -----------------------------------
const warehouseUuid = "33333333-3333-4333-8333-333333333333";
const sampleInventoryFilter: InventoryFilter = {
  q: "nhong xich",
  categoryId: "11111111-1111-4111-8111-111111111111",
  stageId: "22222222-2222-4222-8222-222222222222",
  warehouseId: warehouseUuid,
  stockStatus: "duoi_dinh_muc",
  tradingStatus: "all",
  sortBy: "totalStock",
  sortDir: "desc",
  page: 4,
  pageSize: 100,
};

assert.deepEqual(readInventoryFilterFromUrl(new URLSearchParams("")), DEFAULT_INVENTORY_FILTER, "URL rỗng ra bộ lọc mặc định");
assert.equal(writeInventoryFilterToUrl(DEFAULT_INVENTORY_FILTER).toString(), "", "bộ lọc tồn kho mặc định không ghi gì vào URL");
{
  const parsed = readInventoryFilterFromUrl(new URLSearchParams(`ton=duoi_dinh_muc&kho=${warehouseUuid}`));
  assert.equal(parsed.stockStatus, "duoi_dinh_muc", "đọc được ?ton=duoi_dinh_muc");
  assert.equal(parsed.warehouseId, warehouseUuid, "đọc được ?kho=<uuid>");
}
assert.equal(readInventoryFilterFromUrl(new URLSearchParams("kho=kho-1")).warehouseId, null, "kho không phải uuid bị bỏ");
assert.equal(readInventoryFilterFromUrl(new URLSearchParams("ton=bay")).stockStatus, null, "trạng thái tồn lạ bị bỏ");
assert.equal(readInventoryFilterFromUrl(new URLSearchParams("trang=-5")).page, 1, "page âm về 1");
assert.equal(readInventoryFilterFromUrl(new URLSearchParams("sap_xep=updated_at")).sortBy, null, "màn tồn không sắp theo updated_at");
assert.deepEqual(
  readInventoryFilterFromUrl(writeInventoryFilterToUrl(sampleInventoryFilter)),
  sampleInventoryFilter,
  "bộ lọc tồn kho quay vòng qua URL không mất giá trị",
);
assert.equal(
  writeInventoryFilterToUrl(sampleInventoryFilter).get("kinh_doanh"),
  "tat_ca",
  "tham số URL giữ tiếng Việt không dấu",
);
{
  const args = toInventoryRpcArgs({ ...DEFAULT_INVENTORY_FILTER, tradingStatus: "all" });
  assert.ok("p_dang_kinh_doanh" in args, "lọc tất cả phải có khóa p_dang_kinh_doanh");
  assert.equal(args.p_dang_kinh_doanh, null, "lọc tất cả gửi null tường minh, không phải undefined");
}
assert.equal(toInventoryRpcArgs(DEFAULT_INVENTORY_FILTER).p_dang_kinh_doanh, true);
assert.equal(toInventoryRpcArgs(sampleInventoryFilter).p_kho_id, warehouseUuid);
assert.equal(toInventoryRpcArgs(sampleInventoryFilter).p_sap_xep, "tong_ton", "sortBy map sang tên cột database");
assert.equal(toInventoryRpcArgs(DEFAULT_INVENTORY_FILTER).p_tu_khoa, undefined, "ô tìm rỗng không gửi từ khóa");
assert.equal(countActiveInventoryFilters(DEFAULT_INVENTORY_FILTER), 0);
assert.equal(countActiveInventoryFilters(sampleInventoryFilter), 5, "nhóm + công đoạn + kho + tồn + kinh doanh");
assert.equal(
  countActiveInventoryFilters({ ...DEFAULT_INVENTORY_FILTER, q: "tìm gì đó" }),
  0,
  "ô tìm KHÔNG tính vào số điều kiện của panel lọc",
);

// --- Drill-down từ trang tổng quan sang /ton-kho (Phase 7, 07-04) ----------
{
  const groupId = "44444444-4444-4444-8444-444444444444";
  assert.equal(
    buildInventoryDrilldownUrl({
      groupBy: "category" as StockGroupBy,
      groupId,
      warehouseId: null,
      stockStatus: "am",
    }),
    `/ton-kho?nhom=${groupId}&ton=am`,
    "drill-down theo nhóm hàng + trạng thái âm",
  );

  const stageUrl = buildInventoryDrilldownUrl({
    groupBy: "stage",
    groupId,
    warehouseId: warehouseUuid,
    stockStatus: "duoi_dinh_muc",
  });
  const stageParams = new URLSearchParams(stageUrl.split("?")[1]);
  assert.equal(stageParams.get("cong_doan"), groupId);
  assert.equal(stageParams.get("kho"), warehouseUuid);
  assert.equal(stageParams.get("ton"), "duoi_dinh_muc");
  assert.equal(stageParams.get("kinh_doanh"), null, "không đặt kinh_doanh, dùng mặc định 'đang kinh doanh'");
  assert.equal(stageParams.get("nhom"), null, "groupBy=stage không được kèm nhom");
  assert.equal(stageParams.get("trang"), null, "không mang theo trang từ lần lọc trước");

  assert.equal(
    buildInventoryDrilldownUrl({
      groupBy: "category",
      groupId,
      warehouseId: null,
      stockStatus: null,
    }),
    `/ton-kho?nhom=${groupId}`,
    "cột 'Tổng mã' không có stockStatus thì không có ?ton=",
  );

  const roundTrip = readInventoryFilterFromUrl(new URLSearchParams(stageUrl.split("?")[1]));
  assert.equal(roundTrip.stageId, groupId);
  assert.equal(roundTrip.warehouseId, warehouseUuid);
  assert.equal(roundTrip.stockStatus, "duoi_dinh_muc");
  assert.equal(roundTrip.tradingStatus, "active", "URL drill-down luôn quay vòng về 'đang kinh doanh'");
}

// --- Đếm xuất âm theo lý do + so nhịp bán (Phase 7, 07-04) -----------------
{
  const empty = countNegativeByReason([]);
  assert.equal(empty.length, 4, "luôn trả đủ 4 lý do cố định kể cả không có dòng nào");
  assert.deepEqual(
    empty.map((r) => r.code),
    ["MA_BI_TACH", "HANG_VE_CHUA_NHAP", "LECH_TON_CHO_KIEM_KE", "KHAC"],
    "đúng thứ tự NEGATIVE_REASONS",
  );
  assert.ok(
    empty.every((r) => r.count === 0),
    "mảng rỗng thì mọi lý do cố định đếm 0",
  );

  const withLines = countNegativeByReason([
    { reasonCode: "KHAC" },
    { reasonCode: "KHAC" },
    { reasonCode: "MA_BI_TACH" },
    { reasonCode: "ZQX_LA" },
    { reasonCode: null },
  ]);
  const byCode = new Map(withLines.map((r) => [r.code, r]));
  assert.equal(byCode.get("KHAC")?.count, 2);
  assert.equal(byCode.get("MA_BI_TACH")?.count, 1);
  assert.equal(byCode.get("HANG_VE_CHUA_NHAP")?.count, 0);
  assert.equal(byCode.get("LECH_TON_CHO_KIEM_KE")?.count, 0);
  assert.equal(byCode.get("ZQX_LA")?.count, 1, "mã lạ vẫn được đếm, nhãn giữ nguyên văn");
  assert.equal(byCode.get("ZQX_LA")?.label, "ZQX_LA");
  assert.equal(byCode.get(null)?.count, 1);
  assert.equal(byCode.get(null)?.label, "Chưa ghi lý do");
  assert.equal(
    withLines.reduce((sum, r) => sum + r.count, 0),
    5,
    "tổng count bằng đúng số dòng đầu vào",
  );
}

assert.deepEqual(compareSalesPace(5, 3), { diff: 2, trend: "up" });
assert.deepEqual(compareSalesPace(3, 5), { diff: -2, trend: "down" });
assert.deepEqual(compareSalesPace(4, 4), { diff: 0, trend: "same" });
assert.deepEqual(compareSalesPace(7, 0), { diff: 7, trend: "up" }, "hôm qua = 0 không được chia nổ");

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

// --- Kiểm kê: ngưỡng lệch và nhãn trạng thái phiên (06-09) ------------------
assert.equal(discrepancyOf(8, 10), -2);
assert.equal(discrepancyOf(10, 10), 0);

assert.equal(isLargeDiscrepancy(10, 10), false, "lệch 0 thì không lớn");
assert.equal(isLargeDiscrepancy(15, 10), true, "|5| >= ngưỡng tuyệt đối");
assert.equal(isLargeDiscrepancy(11, 10), true, "lệch 10% tồn sổ");
assert.equal(
  isLargeDiscrepancy(104, 100),
  false,
  "lệch 4 và 4% đều dưới ngưỡng",
);
assert.equal(
  isLargeDiscrepancy(2, 0),
  false,
  "tồn sổ 0 không tính theo tỉ lệ, lệch tuyệt đối dưới ngưỡng",
);
assert.equal(isLargeDiscrepancy(5, 0), true, "lệch tuyệt đối 5 đạt ngưỡng");
assert.equal(isLargeDiscrepancy(0, 3), true, "lệch -3 là 100% tồn sổ");
assert.equal(
  isLargeDiscrepancy(0, -4),
  true,
  "tồn sổ âm vẫn tính theo trị tuyệt đối (4/4 = 100%)",
);

assert.equal(
  sessionStatus({ state: "HOAN_THANH", counted: 3, scope: 5, recount: 0 }),
  "approved",
);
assert.equal(
  sessionStatus({ state: "DA_HUY", counted: 0, scope: 5, recount: 0 }),
  "voided",
);
assert.equal(
  sessionStatus({ state: "NHAP_LIEU", counted: 0, scope: 5, recount: 0 }),
  "new",
);
assert.equal(
  sessionStatus({ state: "NHAP_LIEU", counted: 2, scope: 5, recount: 0 }),
  "counting",
);
assert.equal(
  sessionStatus({ state: "NHAP_LIEU", counted: 5, scope: 5, recount: 0 }),
  "ready",
);
assert.equal(
  sessionStatus({ state: "NHAP_LIEU", counted: 5, scope: 5, recount: 1 }),
  "counting",
);
assert.deepEqual(SESSION_STATUS_LABELS, {
  new: "Mới mở",
  counting: "Đang đếm",
  ready: "Chờ duyệt",
  approved: "Đã duyệt",
  voided: "Đã hủy",
});

// --- Bộ lọc lịch sử KiotViet (06-08, D-11/D-12) -----------------------------
{
  const parsed = readHistoryFilterFromUrl(
    new URLSearchParams("loai=XUAT&tim=quynh&trang=2"),
  );
  assert.equal(parsed.type, "XUAT", "đọc được ?loai=XUAT");
  assert.equal(parsed.keyword, "quynh", "đọc được ?tim=quynh");
  assert.equal(parsed.page, 2, "đọc được ?trang=2");
}
assert.equal(
  readHistoryFilterFromUrl(new URLSearchParams("loai=abc")).type,
  "",
  "loại lạ về rỗng (tất cả)",
);
assert.equal(
  readHistoryFilterFromUrl(new URLSearchParams("tu_ngay=2026-13-45")).from,
  "",
  "ngày không có thật (tháng 13, ngày 45) bị bỏ dù đúng khuôn số",
);
assert.equal(
  readHistoryFilterFromUrl(new URLSearchParams("trang=-3")).page,
  1,
  "page âm về 1",
);
assert.equal(
  writeHistoryFilterToUrl(DEFAULT_HISTORY_FILTER).toString(),
  "",
  "bộ lọc lịch sử mặc định không ghi gì vào URL",
);
{
  const params = writeHistoryFilterToUrl({
    ...DEFAULT_HISTORY_FILTER,
    type: "NHAP",
    from: "2026-01-01",
  });
  assert.ok(params.toString().includes("loai=NHAP"), "ghi được loai=NHAP");
  assert.ok(
    params.toString().includes("tu_ngay=2026-01-01"),
    "ghi được tu_ngay=2026-01-01",
  );
  assert.ok(!params.toString().includes("trang="), "page mặc định không ghi vào URL");
}
{
  const sampleHistoryFilter: KiotVietHistoryFilter = {
    type: "XUAT",
    from: "2026-01-01",
    to: "2026-01-31",
    keyword: "quynh",
    voucherNo: "D-10",
    productCode: "ABC123",
    page: 3,
    pageSize: 50,
  };
  assert.deepEqual(
    readHistoryFilterFromUrl(
      new URLSearchParams(writeHistoryFilterToUrl(sampleHistoryFilter)),
    ),
    sampleHistoryFilter,
    "bộ lọc lịch sử quay vòng qua URL không mất giá trị",
  );
}
assert.equal(
  toHistoryRpcArgs({ ...DEFAULT_HISTORY_FILTER, keyword: "  " }).p_tu_khoa,
  undefined,
  "từ khóa chỉ toàn khoảng trắng không gửi p_tu_khoa",
);
assert.equal(
  toHistoryRpcArgs(DEFAULT_HISTORY_FILTER, { productId: "sp-1" }).p_san_pham_id,
  "sp-1",
  "truyền productId ra p_san_pham_id",
);
assert.equal(
  countActiveHistoryFilters(DEFAULT_HISTORY_FILTER),
  0,
  "bộ lọc mặc định không có điều kiện nào đang bật",
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

// --- Lịch sử KiotViet: khóa dòng bảng -----------------------------------------
// antd v6 bỏ tham số index của rowKey (bẫy 11) nên khóa phải có sẵn trong dữ
// liệu. Một phiếu KiotViet có thể lặp cùng mã hàng hai dòng.
{
  const dong = {
    nguon: "XUAT", ma_phieu: "HD000123", ngay: "2025-01-02", doi_tac: "Khách lẻ",
    ma_hang: "XWA", ten_hang: "BAGA XUỒNG WAVE", so_luong: 2, ghi_chu: "",
    tong_nhap: 0, tong_so_dong: 2, tong_xuat: 4,
  };
  const rows = [dong, dong].map(toKiotVietHistoryRow);
  assert.equal(typeof rows[0]?.key, "string", "mỗi dòng lịch sử KiotViet có khóa");
  assert.notEqual(rows[0]?.key, rows[1]?.key, "hai dòng trùng mã trong một phiếu có khóa khác nhau");
}

// --- Ô chọn tìm không dấu ---------------------------------------------------
// Bộ lọc mặc định của antd so khớp nguyên văn: gõ "lien" không ra "LIÊN HOA".
{
  assert.ok(labelMatches("lien", "NCC000023 — CÔNG TY TNHH LIÊN HOA"), "gõ không dấu, chữ thường vẫn khớp nhãn có dấu");
  assert.ok(labelMatches("cong ty", "CÔNG TY TNHH TÂM PHONG"), "khớp nhiều từ");
  assert.ok(labelMatches("dung", "CÔNG TY TNHH TMDV DŨNG PHONG"), "đ/Đ và dấu ngã đều bỏ");
  assert.ok(labelMatches("  kho 1 ", "Kho 1"), "bỏ khoảng trắng hai đầu");
  assert.ok(!labelMatches("xyz", "Kho 1"), "không khớp thì trả false");
}

void kiemCsvLoi().then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});
