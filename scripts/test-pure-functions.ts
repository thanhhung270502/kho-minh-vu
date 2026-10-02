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
import { buildCsv } from "../src/shared/lib/csv";
import { toAnalysisRow, type AnalysisRow, type AnalysisSettings } from "../src/features/analytics/types";
import {
  buildReorderCsv,
  coverBucket,
  finishOf,
  kpisOf,
  reorderTabs,
  salesPaceChange,
  slowMoving,
  stockStatus,
  suggestedOrder,
  topGroups,
  topSellers,
} from "../src/features/analytics/lib/analysis";
import { toProductInsert, type ProductInput } from "../src/features/products/types";
import { TEMPLATE_COLUMNS } from "../src/features/products/lib/excel-template";
import {
  quickLookupSchema,
  suggestLookupCode,
  toQuickLookupInsert,
} from "../src/features/products/schemas/quick-lookup.schema";
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
  countActiveFilters,
  readFilterFromUrl,
  writeFilterToUrl,
  toListRpcArgs,
  type ProductFilter,
} from "../src/features/products/schemas/filter.schema";
import {
  groupLinesByWarehouse,
  UNASSIGNED_WAREHOUSE_LABEL,
} from "../src/features/sales-order/lib/group-lines-by-warehouse";
import { toOrderDetail, toOrderRow, type OrderLine } from "../src/features/sales-order/types";
import { orderActionsFor } from "../src/features/sales-order/lib/order-actions";
import { needsNegativeReason } from "../src/features/sales-order/lib/complete-order";
import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  readOrderFilterFromUrl,
  toOrderListRpcArgs,
  toOrderUpdate,
  writeOrderFilterToUrl,
} from "../src/features/sales-order/schemas/order.schema";
import {
  DEFAULT_RECIPIENT_KIND,
  RECIPIENT_KIND_ORDER,
  formatRecipient,
  toRecipient,
} from "../src/shared/lib/recipient";
import { SETTINGS_TABS, firstTabForRole, tabsForRole } from "../src/features/settings/lib/settings-tabs";
import { staffSchema } from "../src/features/settings/schemas/staff.schema";
import { toDocumentDetail } from "../src/features/documents/types";
import { toDocumentUpdate } from "../src/features/documents/schemas/document.schema";
import {
  discrepancyOf,
  isLargeDiscrepancy,
} from "../src/features/stocktake/lib/discrepancy";
import {
  sessionStatus,
  SESSION_STATUS_LABELS,
} from "../src/features/stocktake/lib/session-status";
import {
  scaleToFit,
  checkPickedFile,
  safeFileStem,
  isWebp,
  detectImageFormat,
} from "../src/features/images/lib/image-rules";
import { imageUrl } from "../src/features/images/lib/image-url";
import {
  filterNavItems,
  splitMobileItems,
  buildNavEntries,
  NAV_ITEMS,
} from "../src/shared/lib/navigation";
import { homePathForRole } from "../src/features/dashboard/lib/home-path";
import {
  buildCatalogDrilldownUrl,
  type StockGroupBy,
} from "../src/features/dashboard/lib/stock-drilldown";
import {
  countNegativeByReason,
  compareSalesPace,
} from "../src/features/dashboard/lib/dashboard-stats";
import { parseImageCell, buildCopyPlan } from "./copy-kiotviet-images/parse-image-cell";

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
assert.equal(hasPermission("van_phong", "manage-lookups"), true);
assert.equal(hasPermission("van_phong", "manage-users"), false);

// --- Trang chủ theo vai trò + quyền "view-dashboard" (Phase 7, 07-04) -----
assert.equal(homePathForRole("quan_ly"), "/");
// Phase 10: Xuất kho thành Hóa đơn, trang Tồn kho gỡ — tra tồn ở Danh sách hàng hóa.
assert.equal(homePathForRole("van_phong"), "/hoa-don");
assert.equal(homePathForRole("thu_kho"), "/danh-muc");
assert.equal(homePathForRole("chi_xem"), "/danh-muc");

assert.equal(hasPermission("quan_ly", "view-dashboard"), true);
assert.equal(hasPermission("van_phong", "view-dashboard"), false);
assert.equal(hasPermission("thu_kho", "view-dashboard"), false);
assert.equal(hasPermission("chi_xem", "view-dashboard"), false);

// Phase 10 (GON-02): màn Lịch sử KiotViet đã gỡ khỏi giao diện — không còn
// mục menu nào trỏ tới, và filterNavItems không còn nhận công tắc theo người.
{
  assert.ok(
    !NAV_ITEMS.some((i) => i.href === "/lich-su-kiotviet"),
    "không còn mục menu /lich-su-kiotviet",
  );
  assert.ok(
    filterNavItems({ role: "quan_ly" }, NAV_ITEMS).some((i) => i.href === "/kiem-ke"),
    "filterNavItems chỉ cần vai trò",
  );
}

// Phase 10 (GON-03): bỏ giá khỏi giao diện. Payload ghi mã hàng KHÔNG BAO GIỜ
// mang gia_ban — có khóa đó là sửa mã sẽ ghi đè giá thật trong DB.
{
  const input = {
    code: "ABC", name: "Tên", categoryId: null, unitId: "u", stageId: "s",
    conversion: 1, defaultWarehouseId: null, minStock: 0, maxStock: null,
    barcode: null, note: null, isActive: true,
  } as ProductInput;
  const payload = toProductInsert(input);
  assert.ok(!("gia_ban" in payload), "payload ghi mã hàng không có gia_ban");
  assert.ok(!("gia_von" in payload), "payload ghi mã hàng không có gia_von");
  const keys = TEMPLATE_COLUMNS.map((c) => c.key as string);
  assert.ok(!keys.includes("gia_ban") && !keys.includes("gia_von"), "mẫu Excel không có cột giá");
}

// Phase 11 (NVPT-01/02): đặt hàng mặc định Nội bộ, Nội bộ đứng trước; tab
// Nhân viên phụ trách cho quản lý + văn phòng; tên viết tắt + đầy đủ bắt buộc.
{
  assert.equal(DEFAULT_RECIPIENT_KIND, "internal", "tạo đơn mặc định chế độ Nội bộ");
  assert.deepEqual(RECIPIENT_KIND_ORDER, ["internal", "partner"], "Nội bộ đứng trước Đối tác");

  const nvpt = "/cai-dat/nhan-vien-phu-trach";
  assert.ok(tabsForRole("van_phong").some((t) => t.duongDan === nvpt), "văn phòng có tab Nhân viên phụ trách");
  assert.ok(tabsForRole("quan_ly").some((t) => t.duongDan === nvpt), "quản lý có tab Nhân viên phụ trách");
  assert.ok(!tabsForRole("thu_kho").some((t) => t.duongDan === nvpt), "thủ kho không có tab này");

  const ok = staffSchema.safeParse({ shortName: "  An ", fullName: " Nguyễn Văn An ", isActive: true });
  assert.ok(ok.success && ok.data.shortName === "An" && ok.data.fullName === "Nguyễn Văn An", "cắt khoảng trắng hai đầu");
  const bad = staffSchema.safeParse({ shortName: " ", fullName: "", isActive: true });
  assert.ok(!bad.success, "tên viết tắt và tên đầy đủ bắt buộc");
  assert.deepEqual(
    bad.success ? [] : bad.error.issues.map((i) => i.path[0]).sort(),
    ["fullName", "shortName"],
    "lỗi gắn đúng từng ô",
  );
}

// Phase 11 (NVPT-04): Nhóm hàng / ĐVT / Công đoạn rời Cài đặt — quản lý ở
// Danh sách hàng hóa. Văn phòng vẫn còn tab (Nhân viên phụ trách) để vào Cài đặt.
{
  for (const old of ["/cai-dat/nhom-hang", "/cai-dat/don-vi-tinh", "/cai-dat/cong-doan"]) {
    assert.ok(!SETTINGS_TABS.some((t) => t.duongDan === old), `Cài đặt không còn ${old}`);
  }
  assert.equal(firstTabForRole("van_phong"), "/cai-dat/nhan-vien-phu-trach");
  assert.equal(firstTabForRole("quan_ly"), "/cai-dat/nguoi-dung");
}

// Phase 11 (NVPT-04): "+ Thêm mới" nhóm/ĐVT/công đoạn trong form mã hàng.
// Mã gợi ý từ tên (không dấu, viết hoa, gạch dưới), đúng khuôn mã của 0040.
{
  assert.equal(suggestLookupCode("Xi mạ bóng"), "XI_MA_BONG");
  assert.equal(suggestLookupCode("  Đèn / pha (LED) "), "DEN_PHA_LED");
  assert.equal(suggestLookupCode("Phụ tùng thay thế chính hãng Honda"), "PHU_TUNG_THAY_THE_CH", "cắt còn 20 ký tự");
  assert.equal(suggestLookupCode("!!!"), "");

  const ok = quickLookupSchema.safeParse({ code: " ab-1 ", name: "  Cặp " });
  assert.ok(ok.success);
  assert.deepEqual(ok.success ? toQuickLookupInsert(ok.data) : null, { ma: "AB-1", ten: "Cặp" });
  const bad = quickLookupSchema.safeParse({ code: "có dấu", name: "" });
  assert.deepEqual(
    bad.success ? [] : bad.error.issues.map((i) => i.path[0]).sort(),
    ["code", "name"],
    "mã sai khuôn và tên rỗng báo đúng ô",
  );
}

// filterNavItems (06-16): menu "Kiểm kê" cho mọi vai trò.
{
  const thuKhoItems = filterNavItems(
    { role: "thu_kho" },
    NAV_ITEMS,
  );
  assert.ok(
    thuKhoItems.some((i) => i.href === "/kiem-ke"),
    "thủ kho thấy /kiem-ke",
  );
  assert.ok(
    !thuKhoItems.some((i) => i.href === "/"),
    "thủ kho không có quyền view-dashboard nên không thấy mục Tổng quan (07-04)",
  );

  const vanPhongItems = filterNavItems(
    { role: "van_phong" },
    NAV_ITEMS,
  );
  assert.ok(vanPhongItems.some((i) => i.href === "/kiem-ke"), "văn phòng thấy /kiem-ke");
  assert.ok(
    !vanPhongItems.some((i) => i.href === "/"),
    "văn phòng không thấy mục Tổng quan",
  );

  const quanLyItems = filterNavItems(
    { role: "quan_ly" },
    NAV_ITEMS,
  );
  assert.ok(
    quanLyItems.some((i) => i.href === "/kiem-ke") &&
      quanLyItems.some((i) => i.href === "/cai-dat") &&
      quanLyItems.some((i) => i.href === "/"),
    "quản lý thấy /kiem-ke, /cai-dat và Tổng quan",
  );

  const chiXemItems = filterNavItems(
    { role: "chi_xem" },
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
    ["/hoa-don", "/nhap-kho", "/danh-muc", "/dat-hang"],
    "mất ô Tổng quan thì mục ưu tiên 5 (Đặt hàng) đôn lên lấp đủ 4 ô; Danh sách hàng hóa thay ô Tồn kho",
  );
}

// Phase 10 (GON-04/06): menu nhóm Đơn hàng / Hàng hóa — dựng trên danh sách
// phẳng đã lọc quyền, nhóm đứng ở vị trí mục con đầu tiên.
{
  assert.ok(!NAV_ITEMS.some((i) => i.href === "/ton-kho"), "không còn mục /ton-kho");
  assert.ok(!NAV_ITEMS.some((i) => i.href === "/xuat-kho"), "không còn mục /xuat-kho");

  const entries = buildNavEntries(filterNavItems({ role: "quan_ly" }, NAV_ITEMS));
  assert.deepEqual(
    entries.map((e) => e.label),
    ["Tổng quan", "Đơn hàng", "Nhập kho", "Hàng hóa", "Đối tác", "Cài đặt"],
    "thứ tự menu cấp 1 của quản lý",
  );
  const groupHrefs = (label: string) => {
    const entry = entries.find((e) => e.label === label);
    return entry?.kind === "group" ? entry.items.map((i) => i.href) : null;
  };
  assert.deepEqual(groupHrefs("Đơn hàng"), ["/dat-hang", "/hoa-don"]);
  assert.deepEqual(groupHrefs("Hàng hóa"), ["/danh-muc", "/kiem-ke"]);
  const goods = entries.find((e) => e.label === "Hàng hóa");
  assert.equal(goods?.kind === "group" ? goods.items[0]?.label : null, "Danh sách hàng hóa");

  const chiXem = buildNavEntries(filterNavItems({ role: "chi_xem" }, NAV_ITEMS));
  assert.deepEqual(
    chiXem.map((e) => e.label),
    ["Đơn hàng", "Nhập kho", "Hàng hóa", "Đối tác"],
    "chỉ xem không có Tổng quan, Cài đặt",
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
  hasImage: "without",
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

// --- Bộ lọc "Hình ảnh" (Phase 9, 09-08, D-18, ANH-04) ----------------------
assert.equal(readFilterFromUrl(new URLSearchParams("anh=co")).hasImage, "with", "?anh=co đọc thành with");
assert.equal(readFilterFromUrl(new URLSearchParams("anh=chua")).hasImage, "without", "?anh=chua đọc thành without");
assert.equal(readFilterFromUrl(new URLSearchParams("anh=xyz")).hasImage, null, "giá trị anh lạ bị bỏ");
assert.equal(readFilterFromUrl(new URLSearchParams("")).hasImage, null, "không có khóa anh thì null");
assert.equal(
  writeFilterToUrl({ ...DEFAULT_PRODUCT_FILTER, hasImage: "with" }).get("anh"),
  "co",
  "hasImage with ghi ?anh=co",
);
assert.equal(
  writeFilterToUrl({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" }).get("anh"),
  "chua",
  "hasImage without ghi ?anh=chua",
);
assert.equal(
  toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, hasImage: "with" }).p_co_anh,
  true,
  "hasImage with -> p_co_anh true",
);
assert.equal(
  toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" }).p_co_anh,
  false,
  "hasImage without -> p_co_anh false",
);
assert.equal(
  toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_co_anh,
  undefined,
  "hasImage mặc định null -> p_co_anh undefined",
);
assert.equal(
  countActiveFilters({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" }),
  1,
  "ô Hình ảnh tính vào số điều kiện đang bật",
);

// --- Drill-down từ trang tổng quan sang Danh sách hàng hóa (Phase 10) -------
// Trang /ton-kho đã gỡ; danh mục chưa có lọc theo kho nên kho bị bỏ (đã chốt).
{
  const groupId = "44444444-4444-4444-8444-444444444444";
  assert.equal(
    buildCatalogDrilldownUrl({ groupBy: "category" as StockGroupBy, groupId, stockStatus: "am" }),
    `/danh-muc?nhom=${groupId}&ton=am`,
    "drill-down theo nhóm hàng + trạng thái âm",
  );

  const stageUrl = buildCatalogDrilldownUrl({ groupBy: "stage", groupId, stockStatus: "duoi_dinh_muc" });
  const stageParams = new URLSearchParams(stageUrl.split("?")[1]);
  assert.ok(stageUrl.startsWith("/danh-muc?"));
  assert.equal(stageParams.get("cong_doan"), groupId);
  assert.equal(stageParams.get("ton"), "duoi_dinh_muc");
  assert.equal(stageParams.get("kinh_doanh"), null, "không đặt kinh_doanh, dùng mặc định 'đang kinh doanh'");
  assert.equal(stageParams.get("nhom"), null, "groupBy=stage không được kèm nhom");

  assert.equal(
    buildCatalogDrilldownUrl({ groupBy: "category", groupId, stockStatus: null }),
    `/danh-muc?nhom=${groupId}`,
    "cột 'Tổng mã' không có stockStatus thì không có ?ton=",
  );

  const roundTrip = readFilterFromUrl(new URLSearchParams(stageUrl.split("?")[1]));
  assert.equal(roundTrip.stageId, groupId);
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

// --- Người nhận: đối tác hoặc nội bộ (0076) ---------------------------------
assert.deepEqual(
  toRecipient({ partnerId: "dt-1", partnerCode: "KH01", partnerName: "Liên Hoa", internalId: null, internalName: null }),
  { kind: "partner", id: "dt-1", code: "KH01", name: "Liên Hoa" },
  "có doi_tac_id → người nhận đối tác",
);
assert.deepEqual(
  toRecipient({ partnerId: null, partnerCode: null, partnerName: null, internalId: "nd-1", internalName: "Nguyễn Văn A" }),
  { kind: "internal", id: "nd-1", name: "Nguyễn Văn A" },
  "có nguoi_nhan_id → người nhận nội bộ",
);
assert.equal(
  toRecipient({ partnerId: null, partnerCode: null, partnerName: null, internalId: null, internalName: null }),
  null,
  "không có cả hai (phiếu nhập, kiểm kê…) → null",
);
assert.equal(formatRecipient({ kind: "partner", id: "dt-1", code: "KH01", name: "Liên Hoa" }), "KH01 Liên Hoa");
assert.equal(formatRecipient({ kind: "partner", id: "dt-1", code: null, name: "Liên Hoa" }), "Liên Hoa");
assert.equal(formatRecipient({ kind: "internal", id: "nd-1", name: "Nguyễn Văn A" }), "Nội bộ — Nguyễn Văn A");
assert.equal(formatRecipient(null), "—");

const internalOrderDetail = toOrderDetail({
  id: "dh-1", so_dh: "DH26-000001", ngay_dh: "2026-10-01", trang_thai: "TAM",
  ngay_giao_du_kien: null as unknown as string, doi_tac_id: null as unknown as string, ma_doi_tac: null as unknown as string,
  ten_doi_tac: null as unknown as string, nguoi_nhan_id: "nd-1", ten_nguoi_nhan: "Nguyễn Văn A",
  ghi_chu: null as unknown as string, tong_so_luong_dat: 0, tong_so_luong_da_xuat: 0,
  ho_ten_nguoi_tao: "Văn phòng", created_at: "2026-10-01T00:00:00Z",
  hoa_don_id: null as unknown as string, so_hoa_don: null as unknown as string,
});
// Phase 12 (DON-06): chi_tiet_don mang hóa đơn của đơn; chưa có thì null.
assert.equal(internalOrderDetail.invoice, null, "đơn chưa hoàn thành: không có hóa đơn");
assert.deepEqual(
  toOrderDetail({
    id: "dh-2", so_dh: "DH26-000002", ngay_dh: "2026-10-01", trang_thai: "HOAN_THANH",
    ngay_giao_du_kien: null as unknown as string, doi_tac_id: "dt-1", ma_doi_tac: "KH01",
    ten_doi_tac: "Liên Hoa", nguoi_nhan_id: null as unknown as string, ten_nguoi_nhan: null as unknown as string,
    ghi_chu: null as unknown as string, tong_so_luong_dat: 3, tong_so_luong_da_xuat: 3,
    ho_ten_nguoi_tao: "Văn phòng", created_at: "2026-10-01T00:00:00Z",
    hoa_don_id: "ct-9", so_hoa_don: "PX26-000009",
  }).invoice,
  { id: "ct-9", number: "PX26-000009" },
  "đơn hoàn thành: link sang hóa đơn",
);

// Phase 12 (DON-02/03/05): nút theo trạng thái × quyền. Hoàn thành: QL + VP
// (canEdit); Hủy / Xác nhận / Mở khóa / Đóng sớm: chỉ QL (canApprove).
{
  const ql = { canEdit: true, canApprove: true };
  const vp = { canEdit: true, canApprove: false };
  const tk = { canEdit: false, canApprove: false };
  assert.deepEqual(orderActionsFor("TAM", ql), ["approve", "cancel"]);
  assert.deepEqual(orderActionsFor("TAM", vp), []);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", ql), ["complete", "print", "unlock", "close-early", "cancel"]);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", vp), ["complete", "print"]);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", tk), ["print"]);
  assert.deepEqual(orderActionsFor("HOAN_THANH", ql), ["print"], "đơn hoàn thành: hủy hóa đơn ở màn hóa đơn, không hủy đơn");
  assert.deepEqual(orderActionsFor("DA_HUY", ql), []);
  assert.ok(!orderActionsFor("DA_XAC_NHAN", ql).includes("create-issue" as never), "không còn nút Tạo hóa đơn rời");

  // Lỗi xuất âm thiếu lý do của ghi_so_chung_tu (bẫy 8: object thường, không instanceof).
  assert.equal(needsNegativeReason({ code: "23514", message: "Phải chọn lý do xuất âm cho phiếu PX26-000010" }), true);
  assert.equal(needsNegativeReason({ code: "23514", message: "Đơn DH26-1 đang ở trạng thái TAM" }), false);
  assert.equal(needsNegativeReason(new Error("mạng")), false);
}

assert.deepEqual(
  internalOrderDetail.recipient,
  { kind: "internal", id: "nd-1", name: "Nguyễn Văn A" },
  "chi_tiet_don của đơn nội bộ map ra recipient nội bộ (RPC trả doi_tac_id null dù type khai string)",
);
const partnerOrderRow = toOrderRow({
  id: "dh-2", so_dh: "DH26-000002", ngay_dh: "2026-10-01", trang_thai: "TAM",
  ngay_giao_du_kien: null as unknown as string, doi_tac_id: "dt-1", ten_doi_tac: "Liên Hoa",
  nguoi_nhan_id: null as unknown as string, ten_nguoi_nhan: null as unknown as string, so_dong: 0,
  tong_so_luong_dat: 0, tong_so_luong_da_xuat: 0, ho_ten_nguoi_tao: "Văn phòng",
  ghi_chu: null as unknown as string, created_at: "2026-10-01T00:00:00Z", tong_so_dong: 1,
});
assert.deepEqual(
  partnerOrderRow.recipient,
  { kind: "partner", id: "dt-1", code: null, name: "Liên Hoa" },
  "danh_sach_don không trả mã đối tác → code null",
);

assert.deepEqual(
  toOrderUpdate({ recipient: { kind: "internal", id: "nd-1" } }),
  { doi_tac_id: null, nguoi_nhan_id: "nd-1" },
  "chuyển sang nội bộ phải xóa doi_tac_id, không thì vướng ck_ddh_mot_nguoi_nhan",
);
assert.deepEqual(
  toOrderUpdate({ recipient: { kind: "partner", id: "dt-1" } }),
  { doi_tac_id: "dt-1", nguoi_nhan_id: null },
  "chuyển về đối tác phải xóa nguoi_nhan_id",
);
assert.deepEqual(toOrderUpdate({ note: "x" }), { ghi_chu: "x" }, "không đụng người nhận khi không đổi");

// Bộ lọc chế độ người nhận trên URL — giá trị URL tiếng Việt không dấu, giá trị
// RPC là hợp đồng với database (p_loai_nhan: DOI_TAC | NOI_BO).
const internalFilter = readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=noi_bo"));
assert.equal(internalFilter.recipientKind, "internal", "?nguoi_nhan=noi_bo → internal");
assert.equal(readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=doi_tac")).recipientKind, "partner");
assert.equal(readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=bay")).recipientKind, null, "giá trị lạ → bỏ qua");
assert.equal(readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=toString")).recipientKind, null, "khóa prototype không lọt qua");
assert.equal(writeOrderFilterToUrl(internalFilter).get("nguoi_nhan"), "noi_bo", "ghi ngược ra URL");
assert.equal(writeOrderFilterToUrl(DEFAULT_ORDER_FILTER).has("nguoi_nhan"), false, "mặc định không ghi tham số");
assert.equal(toOrderListRpcArgs(internalFilter).p_loai_nhan, "NOI_BO");
assert.equal(toOrderListRpcArgs(DEFAULT_ORDER_FILTER).p_loai_nhan, undefined, "tất cả → không gửi p_loai_nhan");
assert.equal(countActiveOrderFilters(internalFilter), 1, "lọc chế độ tính là một điều kiện đang bật");

// Phiếu xuất sinh từ đơn nội bộ: chi_tiet_chung_tu trả nguoi_nhan_id (0076).
const internalIssue = toDocumentDetail({
  id: "ct-1", so_ct: "PX26-000001", ngay_ct: "2026-10-01", loai_ct: "XUAT",
  nguon_nhap: null as unknown as "NCC", trang_thai: "NHAP_LIEU", kho_id: "k1", ten_kho: "Kho 1",
  doi_tac_id: null as unknown as string, ma_doi_tac: null as unknown as string, ten_doi_tac: null as unknown as string,
  ghi_chu: null as unknown as string, tong_so_luong: 3, tong_tien: 0, ho_ten_nguoi_tao: "Văn phòng",
  ngay_ghi_so: null as unknown as string, created_at: "2026-10-01T00:00:00Z",
  don_dat_hang_id: "dh-1", so_dh: "DH26-000002", chung_tu_goc_id: null as unknown as string,
  so_ct_goc: null as unknown as string, ly_do_xuat_am: null as unknown as string,
  ghi_chu_ly_do: null as unknown as string, nguoi_duyet_id: null as unknown as string,
  nguoi_nhan_id: "nd-1", ten_nguoi_nhan: "Thủ kho K1",
});
assert.deepEqual(internalIssue.recipient, { kind: "internal", id: "nd-1", name: "Thủ kho K1" });
assert.deepEqual(
  toDocumentUpdate({ internalRecipientId: "nd-2" }),
  { nguoi_nhan_id: "nd-2" },
  "đổi nhân viên nhận trên phiếu xuất nội bộ",
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

// --- Ô chọn tìm không dấu ---------------------------------------------------
// Bộ lọc mặc định của antd so khớp nguyên văn: gõ "lien" không ra "LIÊN HOA".
{
  assert.ok(labelMatches("lien", "NCC000023 — CÔNG TY TNHH LIÊN HOA"), "gõ không dấu, chữ thường vẫn khớp nhãn có dấu");
  assert.ok(labelMatches("cong ty", "CÔNG TY TNHH TÂM PHONG"), "khớp nhiều từ");
  assert.ok(labelMatches("dung", "CÔNG TY TNHH TMDV DŨNG PHONG"), "đ/Đ và dấu ngã đều bỏ");
  assert.ok(labelMatches("  kho 1 ", "Kho 1"), "bỏ khoảng trắng hai đầu");
  assert.ok(!labelMatches("xyz", "Kho 1"), "không khớp thì trả false");
}

// --- Ảnh mã hàng: quy tắc nén và URL (09-03) ---------------------------------
{
  assert.deepEqual(scaleToFit(4000, 3000, 1200), { width: 1200, height: 900 }, "thu vừa cạnh dài, giữ tỉ lệ");
  assert.deepEqual(scaleToFit(800, 600, 1200), { width: 800, height: 600 }, "ảnh nhỏ hơn giới hạn thì không phóng to");
  assert.deepEqual(scaleToFit(3000, 4000, 300), { width: 225, height: 300 }, "ảnh dọc thu theo cạnh dài nhất");
  const canhCuc = scaleToFit(1, 5000, 300);
  assert.ok(canhCuc.width >= 1, "chiều rộng không bao giờ ra 0");

  assert.ok(
    checkPickedFile({ name: "a.heic", type: "image/heic", size: 1000 }) === null,
    "HEIC không bị chặn trước — Safari đọc được, trình duyệt khác báo lúc đọc",
  );
  assert.ok(
    checkPickedFile({ name: "IMG_1.HEIC", type: "", size: 1000 }) === null,
    "HEIC theo đuôi khi type rỗng cũng cho qua",
  );
  assert.equal(checkPickedFile({ name: "a.gif", type: "image/gif", size: 1000 }), null, "GIF được nhận");
  assert.equal(checkPickedFile({ name: "a.bmp", type: "image/bmp", size: 1000 }), null, "BMP được nhận");
  assert.equal(checkPickedFile({ name: "a.avif", type: "image/avif", size: 1000 }), null, "AVIF được nhận");
  assert.equal(checkPickedFile({ name: "zalo.JPG", type: "", size: 1000 }), null, "type rỗng nhận theo đuôi");
  assert.notEqual(
    checkPickedFile({ name: "bao-gia.pdf", type: "application/pdf", size: 1000 }),
    null,
    "không phải ảnh thì bị chặn",
  );
  assert.notEqual(checkPickedFile({ name: "khong-duoi", type: "", size: 1000 }), null, "không type, không đuôi thì bị chặn");
  assert.notEqual(checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 0 }), null, "file rỗng bị chặn");
  assert.notEqual(
    checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 31 * 1024 * 1024 }),
    null,
    "file quá 30 MB bị chặn",
  );
  assert.equal(checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 2_000_000 }), null, "file hợp lệ qua được");

  assert.equal(safeFileStem("PT/XE 01"), "PT_XE_01", "ký tự không hợp lệ thay bằng gạch dưới");
  assert.equal(safeFileStem("///"), "ma-hang", "toàn ký tự không hợp lệ thì trả về mặc định");
  assert.equal(safeFileStem("Á-1"), "A-1", "bỏ dấu tiếng Việt");
  assert.ok(safeFileStem("A".repeat(200)).length <= 80, "cắt tối đa 80 ký tự");

  assert.equal(isWebp(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])), true, "nhận đúng magic byte RIFF/WEBP");
  assert.equal(isWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), false, "không phải WebP thì trả false");
  assert.deepEqual(
    detectImageFormat(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])),
    { mimeType: "image/webp", extension: "webp" },
    "WebP từ Chrome/Android",
  );
  assert.deepEqual(
    detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    { mimeType: "image/jpeg", extension: "jpg" },
    "JPEG dự phòng từ iPhone",
  );
  assert.equal(detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null, "PNG thô không nhận");

  assert.equal(imageUrl("abc"), "/anh/abc", "URL ảnh gốc");
  assert.equal(imageUrl("abc", "thumb"), "/anh/abc?co=nho", "URL ảnh thumb dùng tham số tiếng Việt không dấu");
}

// --- Chép ảnh KiotViet (09-12) ----------------------------------------------
{
  assert.deepEqual(parseImageCell(null), [], "null trả mảng rỗng");
  assert.deepEqual(parseImageCell(""), [], "chuỗi rỗng trả mảng rỗng");
  assert.deepEqual(
    parseImageCell("https://cdn2-retail-images.kiotviet.vn/a.jpg"),
    ["https://cdn2-retail-images.kiotviet.vn/a.jpg"],
    "một URL hợp lệ",
  );
  assert.deepEqual(
    parseImageCell(" https://x/a.jpg , https://x/b.jpg,https://x/a.jpg "),
    ["https://x/a.jpg", "https://x/b.jpg"],
    "trim, giữ thứ tự, bỏ trùng",
  );
  assert.deepEqual(
    parseImageCell("abc, ftp://x/y.jpg, https://x/c.jpg"),
    ["https://x/c.jpg"],
    "chỉ nhận http/https",
  );

  const plan = buildCopyPlan(
    [
      { code: "A", urls: ["u1", "u2"] },
      { code: "ZZ", urls: ["u3"] },
      { code: "B", urls: [] },
    ],
    new Map([["A", "id-a"], ["B", "id-b"]]),
    new Set(["id-a|u1"]),
  );
  assert.deepEqual(
    plan.jobs,
    [{ productId: "id-a", productCode: "A", url: "u2", order: 1 }],
    "chỉ còn ảnh chưa chép, order theo vị trí trong ô",
  );
  assert.deepEqual(plan.unknownCodes, ["ZZ"], "mã không khớp danh mục");
  assert.equal(plan.alreadyCopied, 1, "đã chép trước đó");
  assert.equal(plan.productsWithImages, 2, "mã B không có url không tính");
  assert.equal(plan.totalImages, 3, "tổng số ảnh trong các dòng có url");

  const planCaseInsensitive = buildCopyPlan(
    [{ code: " a ", urls: ["u1"] }],
    new Map([["A", "id-a"]]),
    new Set(),
  );
  assert.deepEqual(
    planCaseInsensitive.jobs,
    [{ productId: "id-a", productCode: " a ", url: "u1", order: 0 }],
    "mã so khớp không phân biệt hoa thường và trim",
  );
}


// --- Phase 13: phân tích tồn kho (PTICH-01..05) -----------------------------
// Hàm thuần — RPC phan_tich_ton_kho trả số theo mã (pgTAP 98 kiểm), mọi phép
// gom/xếp hạng/màu tính ở đây.
const ANALYSIS_SETTINGS: AnalysisSettings = { redDays: 7, yellowDays: 14, coverDays: 30 };
function arow(over: Partial<AnalysisRow>): AnalysisRow {
  return {
    productId: "p", code: "A", name: "Hàng A", categoryId: "g1", categoryName: "Nhóm 1",
    finish: "SON", unitName: "Cái", stock: 10, customerOrdered: 0, available: 10,
    soldInPeriod: 0, soldFirstHalf: 0, soldSecondHalf: 0, effectiveDays: 30,
    avgDailySales: null, daysOfCover: null, stockoutDate: null, minStock: 0, lastSaleDate: null,
    ...over,
  };
}
{
  // Mapper: numeric PostgREST về dạng chuỗi/số, null giữ null; mã công đoạn lạ -> Khác.
  const mapped = toAnalysisRow({
    san_pham_id: "p1", ma_hang: "RWT", ten_hang: "Hàng RWT", nhom_hang_id: null as unknown as string,
    ten_nhom_hang: null as unknown as string, cong_doan_ma: "MUA_NGOAI", ten_dvt: "Cái",
    ton: 1, khach_dat: 0, ton_kha_dung: 1, ban_trong_ky: 59, ban_nua_dau: 20, ban_nua_sau: 39,
    so_ngay_thuc: 27, ban_tb_ngay: 2.1852, so_ngay_con: 0.46, ngay_het_du_kien: "2026-10-02",
    ton_toi_thieu: 0, ngay_ban_cuoi: "2026-09-29",
  });
  assert.equal(mapped.finish, "KHAC", "MUA_NGOAI gộp vào Khác");
  assert.equal(mapped.avgDailySales, 2.1852);
  assert.equal(mapped.categoryName, null);

  // Ví dụ kiểm chứng trong spec Notion: tồn 1, bán 59 trong 27 ngày -> ⌈2,19 × 30 − 1⌉ = 65.
  assert.equal(suggestedOrder(arow({ available: 1, avgDailySales: 59 / 27 }), 30), 65, "đề nghị nhập ví dụ RWT = 65");
  assert.equal(suggestedOrder(arow({ available: 500, avgDailySales: 1 }), 30), 0, "đủ hàng: đề nghị 0, không âm");
  assert.equal(suggestedOrder(arow({ available: 0, avgDailySales: null }), 30), 0, "không bán: không đề nghị nhập");

  const st = (o: Partial<AnalysisRow>) => stockStatus(arow(o), ANALYSIS_SETTINGS);
  assert.equal(st({ stock: 0, avgDailySales: 2, daysOfCover: 0 }), "out", "tồn <= 0 luôn Hết hàng");
  assert.equal(st({ stock: 5, avgDailySales: 1, daysOfCover: 7 }), "urgent", "<= ngưỡng đỏ");
  assert.equal(st({ stock: 5, avgDailySales: 1, daysOfCover: 14 }), "soon", "<= ngưỡng vàng");
  assert.equal(st({ stock: 5, avgDailySales: 1, daysOfCover: 15 }), "ok", "trên ngưỡng vàng");
  assert.equal(st({ stock: 5, avgDailySales: null }), "no-sales", "còn tồn, không bán: Không bán");
  assert.equal(st({ stock: 0, avgDailySales: null }), "stopped", "hết tồn, không bán: Ngừng bán?");

  const b = (o: Partial<AnalysisRow>) => coverBucket(arow(o), ANALYSIS_SETTINGS);
  assert.equal(b({ avgDailySales: null }), "no-data");
  assert.equal(b({ stock: 0, avgDailySales: 1, daysOfCover: 0 }), "out");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 14 }), "le-x", "<= X (ngưỡng vàng)");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 30 }), "x-30");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 90 }), "31-90");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 364 }), "91-364");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 365 }), "ge-365");

  assert.equal(finishOf("XI_MA"), "XI_MA");
  assert.equal(finishOf(null), "KHAC");

  const rows = [
    arow({ code: "S1", stock: 5, avgDailySales: 1, daysOfCover: 5, soldInPeriod: 30, categoryId: "g1" }),
    arow({ code: "S2", stock: 10, avgDailySales: 1, daysOfCover: 10, soldInPeriod: 30, categoryId: "g1" }),
    arow({ code: "L1", stock: 20, avgDailySales: 1, daysOfCover: 20, soldInPeriod: 30, categoryId: "g2", categoryName: "Nhóm 2" }),
    arow({ code: "O1", stock: 0, avgDailySales: 2, daysOfCover: 0, soldInPeriod: 60, categoryId: "g2", categoryName: "Nhóm 2" }),
    arow({ code: "O2", stock: -3, avgDailySales: null, soldInPeriod: 0 }),
    arow({ code: "N1", stock: 40, avgDailySales: null, soldInPeriod: 0 }),
    arow({ code: "N2", stock: 70, avgDailySales: null, soldInPeriod: 0 }),
    arow({ code: "B1", stock: 400, avgDailySales: 1, daysOfCover: 400, soldInPeriod: 30, categoryId: "g3", categoryName: "Nhóm 3" }),
  ];

  const k = kpisOf(rows, ANALYSIS_SETTINGS);
  assert.deepEqual(k.needSoon, { count: 2, total: 8 }, "cần nhập trong X ngày: S1, S2 (còn hàng, <= 14 ngày)");
  assert.deepEqual(k.outWithDemand, { count: 1, outTotal: 2 }, "hết hàng vẫn có khách mua: O1 / 2 mã hết");
  assert.deepEqual(k.totalStock, { quantity: 545, productsInStock: 6 }, "Σ tồn của mã còn hàng");
  assert.deepEqual(k.noSalesStock, { quantity: 110, products: 2, share: 110 / 545 }, "tồn không có tín hiệu bán: N1 + N2");

  const tabs = reorderTabs(rows, ANALYSIS_SETTINGS);
  assert.deepEqual(tabs.soon.map((r) => r.code), ["S1", "S2"], "sắp hết, ít ngày nhất lên đầu");
  assert.deepEqual(tabs.outWithDemand.map((r) => r.code), ["O1"]);
  assert.deepEqual(tabs.later.map((r) => r.code), ["L1"], "còn X+1..30 ngày");

  assert.deepEqual(topSellers(rows, 2).map((r) => r.code), ["O1", "B1"], "bán chạy: bán nhiều nhất, hòa thì theo mã");
  const groups = topGroups(rows, 15);
  assert.equal(groups[0]?.categoryId, "g2", "nhóm bán nhiều nhất trước (90)");
  assert.equal(groups[0]?.daysOfCover, 20 / (90 / 30), "số ngày tồn nhóm = Σ tồn / (Σ bán / số ngày)");

  const slow = slowMoving(rows);
  assert.deepEqual(slow.noSales.map((r) => r.code), ["N2", "N1"], "không bán: tồn nhiều nhất trước, chỉ mã còn tồn");
  assert.deepEqual(slow.overstock.map((r) => r.code), ["B1"], "đủ bán >= 365 ngày");

  // Nhịp bán: TB theo NGÀY CÓ BÁN, nửa sau so với nửa đầu.
  const days = [
    { date: "d1", invoiceCount: 2, quantity: 10 },
    { date: "d2", invoiceCount: 0, quantity: 0 },
    { date: "d3", invoiceCount: 4, quantity: 30 },
    { date: "d4", invoiceCount: 0, quantity: 0 },
  ];
  assert.equal(salesPaceChange(days, "invoices"), 1, "nửa đầu TB 2, nửa sau TB 4 -> +100%");
  assert.equal(salesPaceChange(days, "quantity"), 2, "theo số lượng: 10 -> 30");
  assert.equal(
    salesPaceChange([{ date: "d1", invoiceCount: 0, quantity: 0 }, { date: "d2", invoiceCount: 3, quantity: 5 }], "invoices"),
    null,
    "nửa đầu không bán: không chia cho 0",
  );
}

async function kiemCsvPhanTich() {
  const blob = buildCsv(["Mã", "Ghi chú"], [["A1", 'có "nháy", dấu phẩy'], ["B2", 3]]);
  const byte = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...byte.slice(0, 3)], [0xef, 0xbb, 0xbf], "CSV chung có BOM");
  const text = await blob.text();
  assert.ok(text.includes('"có ""nháy"", dấu phẩy"'), "bọc nháy + nhân đôi nháy");

  const csv = await buildReorderCsv(
    [arow({ code: "RWT", name: "Hàng RWT", available: 1, stock: 1, avgDailySales: 59 / 27, daysOfCover: 0.46 })],
    ANALYSIS_SETTINGS,
  ).text();
  const header = csv.split("\r\n")[0] ?? "";
  assert.ok(header.includes("Đề nghị nhập") && header.includes("Mã hàng"), "CSV đề nghị nhập có tiêu đề tiếng Việt");
  assert.ok(!/giá|vốn/i.test(header), "CSV đề nghị nhập không có cột giá");
  assert.ok(csv.includes("RWT") && csv.includes(",65"), "dòng RWT đề nghị 65");
}

void Promise.all([kiemCsvLoi(), kiemCsvPhanTich()]).then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});
