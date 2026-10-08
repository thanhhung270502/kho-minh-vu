/**
 * Kiểm hàm thuần bằng node:assert — không cần Next.js, không cần database.
 * Chạy: npx tsx scripts/test-pure-functions.ts
 */
import assert from "node:assert/strict";
import { periodRange, shiftPeriod, readPeriodFilter, writePeriodFilter, periodLabel, seriesStep, isCurrentPeriod } from "../src/features/analytics/lib/period";
import {
  matchesPeriodFilter,
  periodKpis,
  breakdown,
  changeRatio,
  hasActivity,
  salesMovers,
  slowStock,
  topCategories,
  topProducts,
} from "../src/features/analytics/lib/period-analysis";
import { toAddOrderLineResult, toOrderStatusCounts } from "../src/features/sales-order/types";
import { statusCountKeyOf, toAddOrderLineRpcArgs, toOrderStatusCountRpcArgs } from "../src/features/sales-order/schemas/order.schema";
import {
  DATE_PRESET_LABELS,
  activeDatePreset,
  datePresetRange,
  isDefaultDateRange,
  readDateRangeOrThisMonth,
  todayInVietnam,
} from "../src/shared/lib/date-presets";
import { readDate } from "../src/features/documents/lib/url-filter";
import { orderProgress } from "../src/features/sales-order/lib/order-progress";
import {
  toFlowDay,
  toOverviewKpis,
  toStockByGroupRow,
} from "../src/features/dashboard/types";
import {
  averageIssuesLabel,
  formatUpdatedAt,
  groupShare,
  negativeByWarehouseLabel,
  oldestPendingLabel,
  pendingBreakdownLabel,
  vsYesterdayLabel,
} from "../src/features/dashboard/lib/overview-format";
import { toGlobalSearchResult, type GlobalSearchResult } from "../src/features/global-search/types";
import { defaultActiveIndex, groupSearchResults, searchResultHref } from "../src/features/global-search/lib/search-results";

import { removeDiacritics, normalizeUsername, usernameToEmail, labelMatches } from "../src/shared/lib/text";
import { hasPermission } from "../src/shared/lib/permissions";
import { safeRedirectPath } from "../src/shared/lib/redirect-path";
import { suggestCustomerName, extractPhoneNumber } from "../src/features/partners/lib/notes";
import { buildErrorCsv, errorFileName } from "../src/features/products/lib/error-file";
import { buildCsv } from "../src/shared/lib/csv";
import { fetchAllPages } from "../src/shared/lib/fetch-all-pages";
import { isInteractiveTarget, readSelectedId, withSelectedId } from "../src/shared/lib/selected-id";
import { docTypeLabel, toPartnerRow } from "../src/features/partners/types";
import { BUSINESS_PERMISSIONS, SCOPE_LABELS, allows, isAdmin, type BusinessPermission, type PermissionSubject, type Role } from "../src/shared/lib/permissions";
import { editUserFormSchema } from "../src/features/settings/schemas/user.schema";
import { activityHref, activityPhrase, activityTime } from "../src/features/dashboard/lib/activity-format";
import { duplicateProblemsInFile } from "../src/features/products/lib/new-product-file";
import { fillNamesFromSheet, readProductNameSheet } from "../src/features/products/lib/product-name-sheet";
import { fromSharedVehiclesDb, toSharedVehiclesDb, usageLine, vehicleColumns, vehicleLabels, withUsageLine } from "../src/features/products/lib/shared-vehicles";
import { INITIAL_IMPORT_STATE, importReducer } from "../src/features/products/lib/new-product-import-state";
import { buildCodeDictionary, parseProductCode } from "../src/features/product-codes/lib/parse-product-code";
import { SourceSheetError, readSourceSheet } from "../src/features/product-codes/lib/source-sheet";
import { dictionaryFromEntries, toSyncEntries } from "../src/features/product-codes/lib/sync-entries";
import { applyCodeToStandardFields, standardNames, toggleManual } from "../src/features/products/lib/standard-fields";
import { chunk, planStandardFill } from "../src/features/products/lib/standard-fill";
import {
  copyProductDefaults,
  expandedActions,
  forecastById,
  standardFieldText,
  toProductFormValues,
} from "../src/features/products/lib/product-expanded";
import {
  CATALOG_REASONS,
  applyToRows,
  catalogProblemsFrom,
  draftProblems,
  toDraftRows,
  toImportPayload,
} from "../src/features/products/lib/new-product-import";
import {
  groupDocuments,
  mapHeaders,
  parseDateCell,
  parseNegativeReason,
  parseQuantityCell,
  parseRecipientKind,
  splitStaffNames,
  type DocumentFileRow,
} from "../src/features/document-excel/lib/document-excel";
import { mapPartnerHeaders, parseActiveFlag, parsePartnerKind } from "../src/features/partners/lib/partner-excel";
import { toAnalysisRow, type AnalysisRow, type AnalysisSettings } from "../src/features/analytics/types";
import {
  buildReorderCsv,
  finishOf,
  reorderTabs,
  stockStatus,
  suggestedOrder,
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
import { toOrderDetail, toOrderLine, toOrderRow, type OrderLine } from "../src/features/sales-order/types";
import { orderActionsFor } from "../src/features/sales-order/lib/order-actions";
import { needsNegativeReason } from "../src/features/sales-order/lib/complete-order";
import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  orderRecipientsSchema,
  readOrderFilterFromUrl,
  toCreateOrderRpcArgs,
  toOrderLineInsert,
  toOrderLineUpdate,
  toOrderListRpcArgs,
  toOrderUpdate,
  toSetOrderRecipientsRpcArgs,
  writeOrderFilterToUrl,
} from "../src/features/sales-order/schemas/order.schema";
import {
  COMMON_GOODS_LABEL,
  formatOrderRecipients,
  isInternalPartnerCode,
  isMultiRecipientOrder,
  lineRecipientLabel,
  partnerLabel,
  recipientDisplayName,
  recipientKindOf,
  staffNames,
  toStaffRefs,
} from "../src/shared/lib/recipient";
import { SETTINGS_TABS, firstTabFor, tabsFor } from "../src/features/settings/lib/settings-tabs";
import { staffSchema } from "../src/shared/schemas/staff.schema";
import { toDocumentDetail, toDocumentLineRecipient, withLineRecipients } from "../src/features/documents/types";
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
import { homePathFor } from "../src/features/dashboard/lib/home-path";
import {
  buildCatalogDrilldownUrl,
  type StockGroupBy,
} from "../src/features/dashboard/lib/stock-drilldown";
import {
  countNegativeByReason,
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


/** Bộ quyền mẫu (0117): Admin luôn đủ 9 quyền (quyen_cua_toi), nhân viên theo người tích. */
const DEFAULT_TITLE: Record<Role, BusinessPermission[]> = {
  quan_ly: BUSINESS_PERMISSIONS.map((p) => p.key),
  van_phong: ["nhap_kho", "tao_don", "xac_nhan_don", "tao_ma_hang"],
  thu_kho: ["nhap_kho"],
  chi_xem: [],
};
const as = (role: Role, extra: BusinessPermission[] = []): PermissionSubject => ({
  role,
  permissions: [...DEFAULT_TITLE[role], ...extra],
});
assert.equal(hasPermission("thu_kho", "view-catalog"), true);
assert.equal(hasPermission("thu_kho", "edit-catalog"), false);
assert.equal(hasPermission("van_phong", "manage-users"), false);

// --- Trang chủ theo vai trò + quyền "view-dashboard" (Phase 7, 07-04) -----
assert.equal(homePathFor(as("quan_ly")), "/");
// Phase 10: Xuất kho thành Hóa đơn, Phase 17: Hóa đơn → Duyệt đơn (/duyet-don), trang Tồn kho gỡ — tra tồn ở Danh sách hàng hóa.
assert.equal(homePathFor(as("van_phong")), "/duyet-don");
assert.equal(homePathFor(as("thu_kho")), "/danh-muc");
assert.equal(homePathFor(as("chi_xem")), "/danh-muc");
// Phase 16: trang chủ theo quyền "Xem dashboard" — tắt cho quản lý không được
// chuyển hướng về chính "/" (vòng lặp vô hạn); bật cho thủ kho thì về "/".
assert.equal(homePathFor({ role: "quan_ly", permissions: [] }), "/duyet-don");
assert.equal(homePathFor(as("thu_kho", ["xem_dashboard"])), "/");

// Phase 16: Tổng quan theo quyền chức vụ "Xem dashboard", không theo vai trò.
assert.equal(allows(as("quan_ly"), "xem_dashboard"), true);
assert.equal(allows(as("van_phong"), "xem_dashboard"), false);
assert.equal(allows(as("thu_kho", ["xem_dashboard"]), "xem_dashboard"), true, "bật cho Thủ kho thì thủ kho xem được");
assert.equal(allows(as("chi_xem"), "view-catalog"), true, "quyền theo phạm vi vẫn đọc vai trò");
assert.equal(allows(as("van_phong", ["phan_quyen"]), ["manage-users", "phan_quyen"]), true, "mảng = có một trong các quyền");
assert.equal(allows(as("thu_kho"), ["manage-users", "phan_quyen"]), false);

// Phase 10 (GON-02): màn Lịch sử KiotViet đã gỡ khỏi giao diện — không còn
// mục menu nào trỏ tới, và filterNavItems không còn nhận công tắc theo người.
{
  assert.ok(
    !NAV_ITEMS.some((i) => i.href === "/lich-su-kiotviet"),
    "không còn mục menu /lich-su-kiotviet",
  );
  assert.ok(
    filterNavItems(as("quan_ly"), NAV_ITEMS).some((i) => i.href === "/kiem-ke"),
    "filterNavItems chỉ cần vai trò",
  );
}

// Phase 10 (GON-03): bỏ giá khỏi giao diện. Payload ghi mã hàng KHÔNG BAO GIỜ
// mang gia_ban — có khóa đó là sửa mã sẽ ghi đè giá thật trong DB.
{
  const input = {
    code: "ABC", name: "Tên", categoryId: null, unitId: "u", stageId: "s",
    conversion: 1, defaultWarehouseId: null, minStock: 0, maxStock: null,
    barcode: null, description: "Mô tả", isActive: true,
    kind: "COMBO", directSale: false, shelfLocation: "A-01",
    brandCode: "H", modelCode: null, partCode: "75", sharedVehicles: [], manualFields: ["linh_kien"],
  } satisfies ProductInput;
  const payload = toProductInsert(input);
  assert.ok(!("gia_ban" in payload), "payload ghi mã hàng không có gia_ban");
  assert.ok(!("gia_von" in payload), "payload ghi mã hàng không có gia_von");
  assert.equal(payload.duoc_ban_truc_tiep, false);
  assert.equal(payload.vi_tri_ke, "A-01");
  // Quy chuẩn mã (B): Loại hàng = HANG_HOA/COMBO; Mô tả vào mo_ta. Ghi chú do DB tự
  // sinh — payload KHÔNG được mang ghi_chu (trigger sẽ đè, người dùng tưởng đã lưu).
  assert.equal(payload.loai_hang, "COMBO");
  assert.equal(payload.mo_ta, "Mô tả");
  assert.ok(!("ghi_chu" in payload), "form không ghi ghi_chu");
  // Phần A: form quản lý Hãng/Dòng/Linh kiện (mã) + danh sách ô chọn tay.
  assert.equal(payload.hang_xe, "H");
  assert.equal(payload.dong_xe, null);
  assert.deepEqual(payload.truong_chon_tay, ["linh_kien"]);
  const keys = TEMPLATE_COLUMNS.map((c) => c.key as string);
  assert.ok(!keys.includes("gia_ban") && !keys.includes("gia_von"), "mẫu Excel không có cột giá");
}

// Phase 11 (NVPT-01/02): đặt hàng mặc định Nội bộ, Nội bộ đứng trước; tab
// Nhân viên phụ trách cho quản lý + văn phòng; tên viết tắt + đầy đủ bắt buộc.
{

  const nvpt = "/cai-dat/nhan-vien-phu-trach";
  assert.ok(!tabsFor(as("van_phong")).some((t) => t.duongDan === nvpt), "0117: nhân viên không có tab Nhân viên phụ trách");
  assert.ok(tabsFor(as("quan_ly")).some((t) => t.duongDan === nvpt), "quản lý có tab Nhân viên phụ trách");
  assert.ok(!tabsFor(as("thu_kho")).some((t) => t.duongDan === nvpt), "thủ kho không có tab này");
  // 0117: tab Nhân viên phụ trách chỉ Admin; quyền Phân quyền mở menu Cài đặt (tab Người dùng).
  assert.ok(!tabsFor(as("thu_kho", ["phan_quyen"])).some((t) => t.duongDan === nvpt));
  assert.ok(tabsFor(as("thu_kho", ["phan_quyen"])).some((t) => t.duongDan === "/cai-dat/nguoi-dung"));
  assert.ok(filterNavItems(as("thu_kho", ["phan_quyen"]), NAV_ITEMS).some((i) => i.href === "/cai-dat"));
  assert.ok(filterNavItems(as("thu_kho", ["xem_dashboard"]), NAV_ITEMS).some((i) => i.href === "/"));

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
  assert.equal(firstTabFor(as("van_phong")), "/cai-dat/nhan-vien-phu-trach");
  assert.equal(firstTabFor(as("quan_ly")), "/cai-dat/nguoi-dung");
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
  const thuKhoItems = filterNavItems(as("thu_kho"),
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

  const vanPhongItems = filterNavItems(as("van_phong"),
    NAV_ITEMS,
  );
  assert.ok(vanPhongItems.some((i) => i.href === "/kiem-ke"), "văn phòng thấy /kiem-ke");
  assert.ok(
    !vanPhongItems.some((i) => i.href === "/"),
    "văn phòng không thấy mục Tổng quan",
  );

  const quanLyItems = filterNavItems(as("quan_ly"),
    NAV_ITEMS,
  );
  assert.ok(
    quanLyItems.some((i) => i.href === "/kiem-ke") &&
      quanLyItems.some((i) => i.href === "/cai-dat") &&
      quanLyItems.some((i) => i.href === "/"),
    "quản lý thấy /kiem-ke, /cai-dat và Tổng quan",
  );

  const chiXemItems = filterNavItems(as("chi_xem"),
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
    ["/duyet-don", "/nhap-hang", "/danh-muc", "/don-dat"],
    "mất ô Tổng quan thì mục ưu tiên 5 (Đơn đặt) đôn lên lấp đủ 4 ô; Danh sách hàng hóa thay ô Tồn kho",
  );
}

// Phase 10 (GON-04/06): menu nhóm Đơn hàng / Hàng hóa — dựng trên danh sách
// phẳng đã lọc quyền, nhóm đứng ở vị trí mục con đầu tiên.
{
  assert.ok(!NAV_ITEMS.some((i) => i.href === "/ton-kho"), "không còn mục /ton-kho");
  assert.ok(!NAV_ITEMS.some((i) => i.href === "/xuat-kho"), "không còn mục /xuat-kho");
  assert.ok(!NAV_ITEMS.some((i) => i.href === "/dat-hang" || i.href === "/hoa-don"), "Phase 17: không còn mục /dat-hang, /hoa-don");

  const entries = buildNavEntries(filterNavItems(as("quan_ly"), NAV_ITEMS));
  assert.deepEqual(
    entries.map((e) => e.label),
    ["Tổng quan", "Hàng hóa", "Đơn hàng", "Nhập hàng", "Đối tác", "Phân tích", "Cài đặt"],
    "thứ tự menu cấp 1 của quản lý (Phase 13 thêm Phân tích)",
  );
  const groupHrefs = (label: string) => {
    const entry = entries.find((e) => e.label === label);
    return entry?.kind === "group" ? entry.items.map((i) => i.href) : null;
  };
  assert.deepEqual(groupHrefs("Đơn hàng"), ["/don-dat", "/duyet-don"]);
  const orders = entries.find((e) => e.label === "Đơn hàng");
  assert.deepEqual(
    orders?.kind === "group" ? orders.items.map((i) => [i.label, i.shortLabel]) : null,
    [
      ["Đơn đặt", "Đơn đặt"],
      ["Duyệt đơn", "Duyệt đơn"],
    ],
    "TEN-01: menu và thanh tab đáy dùng tên mới",
  );
  assert.deepEqual(groupHrefs("Hàng hóa"), ["/danh-muc", "/kiem-ke"]);
  const goods = entries.find((e) => e.label === "Hàng hóa");
  assert.equal(goods?.kind === "group" ? goods.items[0]?.label : null, "Danh sách hàng hóa");

  const chiXem = buildNavEntries(filterNavItems(as("chi_xem"), NAV_ITEMS));
  assert.deepEqual(
    chiXem.map((e) => e.label),
    ["Hàng hóa", "Đơn hàng", "Nhập hàng", "Đối tác"],
    "chỉ xem không có Tổng quan, Cài đặt",
  );
  assert.ok(
    buildNavEntries(filterNavItems(as("thu_kho", ["xem_phan_tich"]), NAV_ITEMS)).some((e) => e.label === "Phân tích"),
    "0117: tích Xem trang Phân tích thì thấy menu",
  );
  assert.ok(
    !buildNavEntries(filterNavItems(as("van_phong"), NAV_ITEMS)).some((e) => e.label === "Phân tích"),
    "0117: chưa tích Xem trang Phân tích thì không thấy",
  );
}

const sampleFilter: ProductFilter = {
  q: "op po",
  categoryId: "11111111-1111-4111-8111-111111111111",
  stageId: null,
  unitId: null,
  stockStatus: "duoi_dinh_muc",
  tradingStatus: "inactive",
  standard: "thieu",
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
// --- Bộ lọc "Quy chuẩn" (quy chuẩn mã phần A) thay nút "Cần rà" -------------
assert.equal(toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_quy_chuan, undefined, "không lọc quy chuẩn thì bỏ trống");
assert.equal(toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, standard: "chon_tay" }).p_quy_chuan, "chon_tay");
assert.equal(toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, standard: "du" }).p_can_ra, undefined, "không còn gửi p_can_ra");
assert.equal(readFilterFromUrl(new URLSearchParams("quy_chuan=du")).standard, "du");
assert.equal(readFilterFromUrl(new URLSearchParams("quy_chuan=xyz")).standard, null, "giá trị quy chuẩn lạ bị bỏ");
assert.equal(readFilterFromUrl(new URLSearchParams("can_ra=1")).standard, null, "link cũ ?can_ra=1 không còn lọc");
assert.ok(!("p_can_ra" in toListRpcArgs(sampleFilter)), "không gửi p_can_ra kể cả khi có lọc khác");

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
assert.deepEqual(
  readReceiptFilterFromUrl(new URLSearchParams("")),
  { ...DEFAULT_RECEIPT_FILTER, ...datePresetRange("month", todayInVietnam()) },
  "URL chưa chọn ngày → mặc định tháng này",
);
assert.equal(
  writeReceiptFilterToUrl({ ...DEFAULT_RECEIPT_FILTER, ...datePresetRange("month", todayInVietnam()) }).toString(),
  "",
  "tháng này là mặc định — không ghi lên URL",
);
assert.equal(
  countActiveReceiptFilters({ ...DEFAULT_RECEIPT_FILTER, ...datePresetRange("month", todayInVietnam()) }),
  0,
  "tháng này không tính là đang lọc",
);
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
    recipientId: null,
    recipientName: null,
    defaultWarehouseId: "kho-1",
    defaultWarehouseName: "Kho 1",
    createdAt: "2026-09-20T00:00:00Z",
    note: null,
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

// --- Người nhận: một đối tác tùy chọn + nhiều nhân viên (0090) ---------------
// Phase 18 (NNHAN, D2/D4): hàm thuần ở shared/lib/recipient.ts.
const staffAn = { id: "a", name: "An" };
const staffBinh = { id: "b", name: "Bình" };
const partnerLienHoa = { id: "d", code: "KH01", name: "Liên Hoa" };
assert.deepEqual(toStaffRefs(["a", "b"], ["An", "Bình"]), [staffAn, staffBinh]);
assert.deepEqual(toStaffRefs(null, null), []);
assert.deepEqual(toStaffRefs(["a"], []), [{ id: "a", name: "?" }], "thiếu tên → '?'");
assert.equal(staffNames([staffAn, { id: "b", name: " Bình " }]), "An, Bình");
assert.equal(staffNames([]), "—");
assert.equal(partnerLabel(partnerLienHoa), "KH01 Liên Hoa");
assert.equal(partnerLabel({ ...partnerLienHoa, code: null }), "Liên Hoa");
assert.equal(partnerLabel({ id: "d", code: null, name: null }), "—");
assert.equal(formatOrderRecipients({ partner: null, staff: [staffAn, staffBinh] }), "An, Bình", "không gắn nhãn Nội bộ");
assert.equal(formatOrderRecipients({ partner: null, staff: [] }), "Chưa chọn người nhận");
assert.equal(formatOrderRecipients({ partner: partnerLienHoa, staff: [] }), "KH01 Liên Hoa");
assert.equal(formatOrderRecipients({ partner: partnerLienHoa, staff: [staffAn] }), "KH01 Liên Hoa · An");
// NB001 (Bộ phận điều phối đơn) là đối tác nội bộ: có nhân viên thì chỉ hiện nhân viên.
const partnerNb001 = { id: "nb1", code: "NB001", name: "BỘ PHẬN ĐIỀU PHỐI ĐƠN" };
assert.equal(formatOrderRecipients({ partner: partnerNb001, staff: [staffAn] }), "An");
assert.equal(formatOrderRecipients({ partner: partnerNb001, staff: [] }), "NB001 BỘ PHẬN ĐIỀU PHỐI ĐƠN");
assert.equal(isInternalPartnerCode("nb002"), true);
assert.equal(isInternalPartnerCode("NBA01"), false, "phải là NB + số");
assert.equal(recipientKindOf({ partner: null, staff: [staffAn] }), "internal");
assert.equal(recipientKindOf({ partner: partnerLienHoa, staff: [] }), "partner");
// Phase 17 (DDAT-02, A3): phiếu đi lấy hàng chỉ in TÊN người nhận — không "Nội bộ —", không mã đối tác.
assert.equal(recipientDisplayName("Nguyễn Văn A"), "Nguyễn Văn A");
assert.equal(recipientDisplayName("  "), "—");
assert.equal(recipientDisplayName(null), "—");
assert.equal(lineRecipientLabel("An", 1), "An");
assert.equal(lineRecipientLabel(null, 2), "Chung", "hàng chung khi đơn có ≥ 2 người");
assert.equal(lineRecipientLabel(null, 1), "");
assert.equal(lineRecipientLabel("  ", 3), "Chung");
assert.equal(COMMON_GOODS_LABEL, "Chung");
assert.equal(isMultiRecipientOrder(1, false), false);
assert.equal(isMultiRecipientOrder(2, false), true);
assert.equal(isMultiRecipientOrder(1, true), true);
assert.equal(isMultiRecipientOrder(0, false), false);

const internalOrderDetail = toOrderDetail({
  id: "dh-1", so_dh: "DH26-000001", ngay_dh: "2026-10-01", trang_thai: "TAM",
  ngay_giao_du_kien: null as unknown as string, doi_tac_id: null as unknown as string, ma_doi_tac: null as unknown as string,
  ten_doi_tac: null as unknown as string, nguoi_nhan_ids: ["nv-1", "nv-2"], ten_nguoi_nhan: ["An", "Bình"],
  ghi_chu: null as unknown as string, tong_so_luong_dat: 0, tong_so_luong_da_xuat: 0,
  ho_ten_nguoi_tao: "Văn phòng", created_at: "2026-10-01T00:00:00Z",
  hoa_don_id: null as unknown as string, so_hoa_don: null as unknown as string,
  ho_ten_nguoi_xac_nhan: null as unknown as string, ngay_xac_nhan: null as unknown as string,
});
// Phase 12 (DON-06): chi_tiet_don mang hóa đơn của đơn; chưa có thì null.
assert.equal(internalOrderDetail.invoice, null, "đơn chưa hoàn thành: không có hóa đơn");
assert.deepEqual(
  toOrderDetail({
    id: "dh-2", so_dh: "DH26-000002", ngay_dh: "2026-10-01", trang_thai: "HOAN_THANH",
    ngay_giao_du_kien: null as unknown as string, doi_tac_id: "dt-1", ma_doi_tac: "KH01",
    ten_doi_tac: "Liên Hoa", nguoi_nhan_ids: [], ten_nguoi_nhan: [],
    ghi_chu: null as unknown as string, tong_so_luong_dat: 3, tong_so_luong_da_xuat: 3,
    ho_ten_nguoi_tao: "Văn phòng", created_at: "2026-10-01T00:00:00Z",
    hoa_don_id: "ct-9", so_hoa_don: "PX26-000009",
    ho_ten_nguoi_xac_nhan: "Quản lý", ngay_xac_nhan: "2026-10-03T08:00:00Z",
  }).invoice,
  { id: "ct-9", number: "PX26-000009" },
  "đơn hoàn thành: link sang hóa đơn",
);

// Phase 12 (DON-02/03/05): nút theo trạng thái × quyền. Hoàn thành: QL + VP
// (canEdit); Hủy / Xác nhận / Mở khóa / Đóng sớm: chỉ QL (canApprove).
{
  const ql = { canEdit: true, canApprove: true, canComplete: true, canCancel: true };
  const vp = { canEdit: true, canApprove: false, canComplete: true, canCancel: false };
  const tk = { canEdit: false, canApprove: false, canComplete: false, canCancel: false };
  assert.deepEqual(orderActionsFor("TAM", ql), ["approve", "cancel"]);
  assert.deepEqual(orderActionsFor("TAM", vp), []);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", ql), ["complete", "print", "unlock", "close-early", "cancel"]);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", vp), ["complete", "print"]);
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", tk), ["print"]);
  assert.deepEqual(orderActionsFor("HOAN_THANH", ql), ["print"], "đơn hoàn thành: hủy hóa đơn ở màn hóa đơn, không hủy đơn");
  assert.deepEqual(orderActionsFor("DA_HUY", ql), []);
  assert.ok(!orderActionsFor("DA_XAC_NHAN", ql).includes("create-issue" as never), "không còn nút Tạo hóa đơn rời");
  // Phase 16: Xác nhận / Hoàn thành theo quyền chức vụ, Hủy đơn vẫn theo phạm vi quản trị.
  const nvXacNhan = { ...vp, canApprove: true };
  assert.deepEqual(orderActionsFor("TAM", nvXacNhan), ["approve"], "bật Xác nhận cho Nhân viên: không kèm Hủy đơn");
  assert.deepEqual(orderActionsFor("DA_XAC_NHAN", { ...ql, canComplete: false }), ["print", "unlock", "close-early", "cancel"],
    "tắt Hoàn thành: mất nút Hoàn thành dù vẫn sửa được đơn");

  // Lỗi xuất âm thiếu lý do của ghi_so_chung_tu (bẫy 8: object thường, không instanceof).
  assert.equal(needsNegativeReason({ code: "23514", message: "Phải chọn lý do xuất âm cho phiếu PX26-000010" }), true);
  assert.equal(needsNegativeReason({ code: "23514", message: "Đơn DH26-1 đang ở trạng thái TAM" }), false);
  assert.equal(needsNegativeReason(new Error("mạng")), false);
}

assert.deepEqual(
  internalOrderDetail.recipients,
  { partner: null, staff: [{ id: "nv-1", name: "An" }, { id: "nv-2", name: "Bình" }] },
  "chi_tiet_don của đơn nội bộ map ra danh sách nhân viên (RPC trả doi_tac_id null dù type khai string)",
);
const partnerOrderRow = toOrderRow({
  id: "dh-2", so_dh: "DH26-000002", ngay_dh: "2026-10-01", trang_thai: "TAM",
  ngay_giao_du_kien: null as unknown as string, doi_tac_id: "dt-1", ma_doi_tac: "KH01", ten_doi_tac: "Liên Hoa",
  nguoi_nhan_ids: [], ten_nguoi_nhan: [], so_dong: 0,
  tong_so_luong_dat: 0, tong_so_luong_da_xuat: 0, ho_ten_nguoi_tao: "Văn phòng",
  ghi_chu: null as unknown as string, created_at: "2026-10-01T00:00:00Z", tong_so_dong: 1,
});
assert.deepEqual(
  partnerOrderRow.recipients,
  { partner: { id: "dt-1", code: "KH01", name: "Liên Hoa" }, staff: [] },
  "danh_sach_don trả mã đối tác (0103) — cần để nhận ra đối tác nội bộ NB…",
);

assert.equal(
  toOrderDetail({
    id: "dh-3", so_dh: "DH26-000003", ngay_dh: "2026-10-01", trang_thai: "TAM",
    ngay_giao_du_kien: null as unknown as string, doi_tac_id: "dt-1", ma_doi_tac: "KH01",
    ten_doi_tac: "Liên Hoa", nguoi_nhan_ids: [], ten_nguoi_nhan: [],
    ghi_chu: null as unknown as string, tong_so_luong_dat: 0, tong_so_luong_da_xuat: 0,
    ho_ten_nguoi_tao: "Văn phòng", created_at: "2026-10-01T00:00:00Z",
    hoa_don_id: null as unknown as string, so_hoa_don: null as unknown as string,
    ho_ten_nguoi_xac_nhan: null as unknown as string, ngay_xac_nhan: null as unknown as string,
  }).recipients.partner?.code,
  "KH01",
);
const orderLineRow = {
  id: "l1", san_pham_id: "p1", ma_hang: "A1", ten_hang: "Hàng", ten_dvt: null as unknown as string,
  so_luong_dat: 2, so_luong_da_xuat: 0, kho_mac_dinh_id: null as unknown as string,
  ten_kho_mac_dinh: null as unknown as string, created_at: "2026-10-01T00:00:00Z",
  ghi_chu: null as unknown as string,
};
{
  const assigned = toOrderLine({ ...orderLineRow, nguoi_nhan_id: "nv-1", ten_nguoi_nhan: "An" });
  assert.equal(assigned.recipientId, "nv-1");
  assert.equal(assigned.recipientName, "An");
  const common = toOrderLine({
    ...orderLineRow, nguoi_nhan_id: null as unknown as string, ten_nguoi_nhan: null as unknown as string,
  });
  assert.equal(common.recipientId, null);
  assert.equal(common.recipientName, null);
}
{
  const uuid1 = "11111111-1111-4111-8111-111111111111";
  const uuid2 = "22222222-2222-4222-8222-222222222222";
  // 0097: đơn tạm được trống người nhận — database đòi người nhận lúc xác nhận.
  assert.equal(orderRecipientsSchema.safeParse({ partnerId: null, staffIds: [] }).success, true);
  assert.equal(orderRecipientsSchema.safeParse({ partnerId: uuid1, staffIds: [] }).success, true);
  assert.equal(orderRecipientsSchema.safeParse({ partnerId: null, staffIds: [uuid2] }).success, true);
  assert.deepEqual(toCreateOrderRpcArgs({ partnerId: null, staffIds: ["u1"] }), {
    p_doi_tac_id: undefined, p_nguoi_nhan_ids: ["u1"],
  });
  assert.deepEqual(toSetOrderRecipientsRpcArgs("o1", { partnerId: "d1", staffIds: [] }), {
    p_don_id: "o1", p_doi_tac_id: "d1", p_nguoi_nhan_ids: [],
  });
  assert.deepEqual(toOrderLineUpdate({ recipientId: null }), { nguoi_nhan_id: null });
  assert.deepEqual(toOrderLineUpdate({ recipientId: "nv-1" }), { nguoi_nhan_id: "nv-1" });
  assert.deepEqual(toOrderLineUpdate({ quantity: 3 }), { so_luong_dat: 3 }, "không đụng người nhận");
  assert.deepEqual(
    toOrderLineInsert("o1", { productId: "p1", quantity: 2, recipientId: "nv-1" }),
    { don_dat_hang_id: "o1", san_pham_id: "p1", so_luong_dat: 2, nguoi_nhan_id: "nv-1" },
  );
  assert.equal("nguoi_nhan_id" in toOrderLineInsert("o1", { productId: "p1", quantity: 2 }), false);
  const staffFilter = readOrderFilterFromUrl(new URLSearchParams(`nhan_vien=${uuid1}`));
  assert.equal(staffFilter.staffId, uuid1);
  assert.equal(readOrderFilterFromUrl(new URLSearchParams("nhan_vien=abc")).staffId, null);
  assert.equal(writeOrderFilterToUrl(staffFilter).get("nhan_vien"), uuid1);
  assert.equal(toOrderListRpcArgs(staffFilter).p_nguoi_nhan_id, uuid1);
  assert.equal(toOrderListRpcArgs(DEFAULT_ORDER_FILTER).p_nguoi_nhan_id, undefined);
  assert.equal(countActiveOrderFilters({ ...DEFAULT_ORDER_FILTER, staffId: uuid1 }), 1);
}
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
  nguoi_nhan_ids: ["nd-1"], ten_nguoi_nhan: ["Thủ kho K1"], ho_ten_nguoi_duyet: "Quản lý", ho_ten_nguoi_xac_nhan_don: "Quản lý",
});
assert.deepEqual(internalIssue.staffRecipients, [{ id: "nd-1", name: "Thủ kho K1" }]);
assert.deepEqual(toDocumentUpdate({ note: "x" }), { ghi_chu: "x" });
assert.deepEqual(
  toDocumentLineRecipient({ chung_tu_dong_id: "l1", nguoi_nhan_id: "nv-1", ten_nguoi_nhan: "An" }),
  { lineId: "l1", recipientId: "nv-1", recipientName: "An" },
);
assert.deepEqual(
  withLineRecipients(
    [{ id: "l1", x: 1 }, { id: "l2", x: 2 }],
    [{ lineId: "l1", recipientId: "nv-1", recipientName: "An" }],
  ),
  [
    { id: "l1", x: 1, recipientId: "nv-1", recipientName: "An" },
    { id: "l2", x: 2, recipientId: null, recipientName: null },
  ],
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
  assert.equal(suggestedOrder(arow({ available: 0, avgDailySales: null }), 30), 0, "không xuất, không định mức: không đề nghị");
  assert.equal(suggestedOrder(arow({ available: 2, avgDailySales: null, minStock: 10 }), 30), 8, "không xuất: bù đủ định mức");
  assert.equal(suggestedOrder(arow({ available: 5, avgDailySales: 0.1, minStock: 20 }), 30), 15, "định mức lớn hơn nhu cầu 30 ngày");

  // Trạng thái theo định mức (stock 10, minStock 0 mặc định).
  const st = (o: Partial<AnalysisRow>) => stockStatus(arow(o), ANALYSIS_SETTINGS);
  assert.equal(st({ stock: 5, available: 5, minStock: 8, avgDailySales: null }), "urgent", "tồn < định mức: Dưới định mức");
  assert.equal(st({ stock: 0, available: 0, avgDailySales: 2 }), "soon", "hết hàng, chưa đặt định mức: Sắp thiếu hàng");
  assert.equal(st({ stock: 10, available: 10, minStock: 5, avgDailySales: 1 }), "soon", "trên định mức, thiếu cho 30 ngày: Sắp thiếu hàng");
  assert.equal(st({ stock: 100, available: 100, minStock: 5, avgDailySales: 1 }), "ok", "trên định mức, đủ 30 ngày: Trên định mức");
  assert.equal(st({ stock: 5, avgDailySales: null }), "no-sales", "không xuất, không dưới định mức");
  assert.equal(st({ stock: 0, avgDailySales: null, customerOrdered: 3, available: -3 }), "soon", "hết hàng có đơn đặt: Sắp thiếu hàng");

  assert.equal(finishOf("XI_MA"), "XI_MA");
  assert.equal(finishOf(null), "KHAC");

  const rows = [
    arow({ code: "M1", stock: 3, available: 3, minStock: 10, avgDailySales: 1, daysOfCover: 3, soldInPeriod: 30 }),
    arow({ code: "S1", stock: 5, available: 5, avgDailySales: 1, daysOfCover: 5, soldInPeriod: 30 }),
    arow({ code: "S2", stock: 10, available: 10, avgDailySales: 1, daysOfCover: 10, soldInPeriod: 30 }),
    arow({ code: "O1", stock: 0, available: 0, avgDailySales: 2, daysOfCover: 0, soldInPeriod: 60 }),
    arow({ code: "N1", stock: 40, avgDailySales: null, soldInPeriod: 0 }),
    arow({ code: "B1", stock: 400, available: 400, avgDailySales: 1, daysOfCover: 400, soldInPeriod: 30 }),
  ];

  const tabs = reorderTabs(rows, ANALYSIS_SETTINGS);
  assert.deepEqual(tabs.urgent.map((r) => r.code), ["M1"], "Dưới định mức");
  assert.deepEqual(tabs.soon.map((r) => r.code), ["O1", "S1", "S2"], "Sắp thiếu hàng, ít ngày nhất lên đầu");
  assert.deepEqual(tabs.outWithDemand.map((r) => r.code), ["O1"]);


}

// --- Phase 14: panel chi tiết — mã đang chọn trên URL `?chon=` (PANEL-01..03) --
{
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(readSelectedId(new URLSearchParams(`chon=${id}`)), id);
  assert.equal(readSelectedId(new URLSearchParams("chon=abc")), null, "không phải uuid: bỏ");
  assert.equal(readSelectedId(new URLSearchParams("")), null);

  const base = new URLSearchParams("q=op&nhom=x&trang=2");
  const opened = withSelectedId(base, id);
  assert.equal(opened.get("chon"), id);
  assert.equal(opened.get("q"), "op", "giữ nguyên bộ lọc đang có");
  assert.equal(opened.get("trang"), "2");
  assert.equal(base.get("chon"), null, "không sửa URLSearchParams gốc");
  assert.equal(withSelectedId(opened, null).get("chon"), null, "đóng panel: bỏ chon");

  // Bấm vào ô chọn, ô sửa nhanh, ảnh, nút, link… KHÔNG mở panel.
  const el = (hit: boolean) => ({ closest: () => (hit ? {} : null) });
  assert.equal(isInteractiveTarget(el(true)), true, "bấm vào phần tử tương tác");
  assert.equal(isInteractiveTarget(el(false)), false, "bấm vào chữ thường của dòng");
  assert.equal(isInteractiveTarget(null), false);
}

// --- Phase 14: bảng đối tác 5 cột + lịch sử giao dịch (PANEL-02/03) --------
{
  const row = toPartnerRow({
    id: "p1", ma: "NCC01", ten: "Vũ Trụ", loai: "NCC", dien_thoai: "", dia_chi: "",
    khu_vuc: "", email: "", ma_so_thue: "", ghi_chu: "", dang_hoat_dong: true,
    updated_at: "2026-10-02", tong_so_dong: 1, tong_giao_dich: "12" as unknown as number,
  });
  assert.equal(row.transactionCount, 12, "tong_giao_dich (bigint có thể về string) → số");
  assert.equal(docTypeLabel("TRA_NCC"), "Trả NCC");
  assert.equal(docTypeLabel("TRA_KHACH"), "Khách trả");
  assert.equal(docTypeLabel("XUAT"), "Hóa đơn");
  assert.equal(docTypeLabel("LA"), "LA", "loại lạ hiện nguyên giá trị");
}

// --- Phase 15: trùng mã / tên TRONG file nhập mã mới (IMP-03) -------------
{
  const rows = [
    { row: 2, code: "BT-01", name: "Bố thắng" },
    { row: 3, code: "bt-01", name: "Nhông" },
    { row: 4, code: "X-01", name: "  bo  THANG " },
    { row: 5, code: "C-01", name: "Căm" },
  ];
  const problems = duplicateProblemsInFile(rows);
  assert.deepEqual(problems.get(2), [
    "Mã hàng trùng với dòng 3",
    "Tên hàng trùng với dòng 4",
  ], "so mã không phân biệt hoa thường, tên không dấu + gộp khoảng trắng");
  assert.deepEqual(problems.get(3), ["Mã hàng trùng với dòng 2"]);
  assert.deepEqual(problems.get(4), ["Tên hàng trùng với dòng 2"]);
  assert.equal(problems.get(5), undefined, "dòng không trùng không có lỗi");
}

// --- Phase 15: màn xem trước nhập mã mới (IMP-02/03) -----------------------
{
  const cai = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const lh = "11111111-1111-4111-8111-111111111111";
  const drafts = toDraftRows(
    [
      { row: 2, code: "A", name: "Áo", nameFromSheet: false, stock: 3, description: "d", problems: [] },
      { row: 3, code: "B", name: "Bé", nameFromSheet: false, stock: 0, description: "", problems: ["Tồn kho không phải là số"] },
      { row: 4, code: "C", name: "Cá", nameFromSheet: false, stock: 1, description: "", problems: [] },
    ],
    { unitId: cai },
  );
  assert.equal(drafts[0].unitId, cai, "ĐVT mặc định CAI");
  assert.equal(drafts[0].isActive && drafts[0].directSale, true, "mặc định đang KD + bán trực tiếp");

  // Áp hàng loạt chỉ đổi đúng dòng đã chọn, không đụng mảng gốc.
  const applied = applyToRows(drafts, [2, 4], { kind: "COMBO", directSale: false });
  assert.deepEqual(applied.map((r) => r.kind), ["COMBO", "HANG_HOA", "COMBO"]);
  assert.deepEqual(applied.map((r) => r.directSale), [false, true, false]);
  assert.equal(drafts[0].kind, "HANG_HOA", "không sửa mảng gốc; mặc định Hàng hóa");

  // Lỗi của dòng = lỗi đọc file + trùng trong file + thiếu ĐVT + đã có trong danh mục.
  const catalog = catalogProblemsFrom([
    { dong: 4, ly_do: "Tên hàng đã có trong danh mục; Chưa chọn đơn vị tính" },
  ]);
  assert.deepEqual(catalog.get(4), [CATALOG_REASONS.name], "chỉ giữ lỗi trùng danh mục, bỏ lỗi đã tự kiểm ở client");
  const noUnit = applyToRows(applied, [2], { unitId: null });
  const problems = draftProblems(noUnit, catalog);
  assert.deepEqual(problems.get(2), ["Chưa chọn đơn vị tính"]);
  assert.deepEqual(problems.get(3), ["Tồn kho không phải là số"]);
  assert.deepEqual(problems.get(4), [CATALOG_REASONS.name]);

  // Payload: chỉ dòng sạch, khóa jsonb đúng hợp đồng RPC nhap_ma_hang_moi.
  const clean = applyToRows(drafts, [4], { categoryId: lh, shelfLocation: " K-1 " });
  const payload = toImportPayload(clean, new Map([[3, ["x"]]]));
  assert.deepEqual(payload.map((p) => p.dong), [2, 4], "bỏ dòng đang lỗi");
  assert.deepEqual(payload[1], {
    dong: 4, ma_hang: "C", ten_hang: "Cá", ton_kho: 1, mo_ta: "",
    dvt_id: cai, nhom_hang_id: lh, loai_hang: "HANG_HOA",
    dang_kinh_doanh: true, duoc_ban_truc_tiep: true, vi_tri_ke: "K-1",
  });
}

// --- Tên hàng tự điền từ sheet tên hàng chuẩn (04/10/2026) -----------------
{
  // Sheet thật: 2 cột không tiêu đề, có dòng rác "--," và mã lặp.
  const names = readProductNameSheet(
    "﻿YAC-01-X,Ốp chắn bùn  trước ACRUZO xi\r\n--,\r\n" +
      '-TKX--201/304,"Tay kiếng xoay 360 Inox 201, 304"\r\nyac-01-x,Tên lặp\r\n',
  );
  assert.equal(names.size, 2, "bỏ dòng thiếu tên, mã lặp giữ dòng đầu");
  assert.equal(names.get("yac-01-x"), "Ốp chắn bùn trước ACRUZO xi", "khóa không phân biệt hoa thường, gộp khoảng trắng");
  assert.equal(names.get("-tkx--201/304"), "Tay kiếng xoay 360 Inox 201, 304", "tên có dấu phẩy trong ngoặc kép");

  const filled = fillNamesFromSheet(
    [
      { row: 2, code: "Yac-01-X", name: "", nameFromSheet: false, stock: 0, description: "", problems: [] },
      { row: 3, code: "YAC-01-X", name: "Tên tự gõ", nameFromSheet: false, stock: 0, description: "", problems: [] },
      { row: 4, code: "KHONG-CO", name: "", nameFromSheet: false, stock: 0, description: "", problems: [] },
    ],
    names,
  );
  assert.deepEqual(filled.map((r) => [r.name, r.nameFromSheet]), [
    ["Ốp chắn bùn trước ACRUZO xi", true],
    ["Tên tự gõ", false],
    ["", false],
  ], "chỉ điền ô trống; tên trong file thắng sheet");

  // Sửa tên trên màn xem trước: bỏ lỗi "tên đã có trong danh mục" của đúng dòng đó.
  const drafts = toDraftRows(filled, { unitId: "u" });
  const loaded = importReducer(INITIAL_IMPORT_STATE, {
    type: "loaded",
    drafts,
    catalog: new Map([[2, [CATALOG_REASONS.code, CATALOG_REASONS.name]], [3, [CATALOG_REASONS.name]]]),
    nameSheetError: null,
  });
  const edited = importReducer(loaded, { type: "edit", rows: [2], patch: { name: "Tên mới", nameFromSheet: false } });
  assert.deepEqual(edited.catalog.get(2), [CATALOG_REASONS.code], "giữ lỗi trùng mã");
  assert.deepEqual(edited.catalog.get(3), [CATALOG_REASONS.name], "dòng khác không đổi");
  assert.equal(edited.drafts[0]?.name, "Tên mới");
  assert.deepEqual(draftProblems(edited.drafts, edited.catalog).get(4), ["Thiếu tên hàng"], "mã không có trong sheet vẫn báo thiếu tên");
}

// --- Xe dùng chung nhiều hãng / dòng (0096) --------------------------------
{
  const dict = dictionaryFromEntries([
    { loai: "hang", ma: "H", ten: "HONDA", ma_hang: null, thu_tu: 1 },
    { loai: "hang", ma: "Y", ten: "YAMAHA", ma_hang: null, thu_tu: 2 },
    { loai: "dong", ma: "A", ten: "Air Blade", ma_hang: "H", thu_tu: 3 },
    { loai: "dong", ma: "V", ten: "Vision", ma_hang: "H", thu_tu: 4 },
    { loai: "dong", ma: "AC", ten: "Acruzo", ma_hang: "Y", thu_tu: 5 },
  ]);
  // Đọc: bỏ phần tử sai dạng; khóa "hang"/"dong" là hợp đồng jsonb.
  assert.deepEqual(fromSharedVehiclesDb([{ hang: "Y", dong: "AC" }, { hang: "" }, "rác", { hang: "H", dong: "" }]), [
    { brandCode: "Y", modelCode: "AC" },
    { brandCode: "H", modelCode: null },
  ]);
  assert.deepEqual(fromSharedVehiclesDb(null), []);
  // Ghi: bỏ dòng chưa chọn hãng, bỏ trùng và bỏ cặp trùng xe chính.
  assert.deepEqual(
    toSharedVehiclesDb(
      [{ brandCode: "Y", modelCode: "AC" }, { brandCode: "y", modelCode: "ac" }, { brandCode: "H", modelCode: "A" }, { brandCode: null, modelCode: null }],
      { brandCode: "H", modelCode: "A" },
    ),
    [{ hang: "Y", dong: "AC" }],
  );
  const labels = vehicleLabels(dict, { brandCode: "H", modelCode: "A" }, [{ brandCode: "Y", modelCode: "AC" }, { brandCode: "H", modelCode: "V" }]);
  assert.deepEqual(labels, ["HONDA Air Blade", "YAMAHA Acruzo", "HONDA Vision"]);
  assert.equal(usageLine(labels.slice(0, 2)), "Dùng cho xe HONDA Air Blade và YAMAHA Acruzo");
  assert.equal(usageLine(labels), "Dùng cho xe HONDA Air Blade, YAMAHA Acruzo và HONDA Vision");
  assert.equal(usageLine(["HONDA Air Blade"]), null, "một xe không cần câu dùng chung");
  // Mô tả: thay dòng đầu do hệ thống quản lý, giữ phần người dùng viết.
  assert.equal(withUsageLine("Hàng loại 1", "Dùng cho xe A và B"), "Dùng cho xe A và B\nHàng loại 1");
  const A = "Dùng cho xe A và B";
  const C = "Dùng cho xe A, B và C";
  // Chỉ thay/bỏ dòng đầu khi nó đúng là dòng hệ thống sinh lần trước.
  assert.equal(withUsageLine(`${A}\nHàng loại 1`, C, A), `${C}\nHàng loại 1`);
  assert.equal(withUsageLine(`${A}\nHàng loại 1`, null, A), "Hàng loại 1");
  assert.equal(withUsageLine(A, null, A), null);
  // Dòng "Dùng cho xe …" do người dùng / KiotViet viết thì giữ nguyên.
  assert.equal(withUsageLine("Dùng cho xe Wave\nx", null, null), "Dùng cho xe Wave\nx");
  assert.equal(withUsageLine("Dùng cho xe Wave\nx", A, null), `${A}\nDùng cho xe Wave\nx`);
  assert.equal(withUsageLine("Dùng cho xe Wave", null, A), "Dùng cho xe Wave");
  assert.equal(withUsageLine(`${A}\nx`, A, null), `${A}\nx`);
  assert.equal(withUsageLine(null, "Dùng cho xe A và B"), "Dùng cho xe A và B");
  // Cột bảng: hãng không lặp, dòng theo thứ tự.
  assert.deepEqual(vehicleColumns(dict, { brandCode: "H", modelCode: "A" }, [{ brandCode: "H", modelCode: "V" }, { brandCode: "Y", modelCode: "AC" }]), {
    brands: ["HONDA", "YAMAHA"],
    models: ["Air Blade", "Vision", "Acruzo"],
  });
}


// --- Phân tích theo kỳ (0099) ------------------------------------------------
{
  // Kỳ: tuần bắt đầu thứ Hai; kỳ đang chạy cắt ở hôm nay; quý / năm đủ ngày.
  assert.deepEqual(periodRange("tuan", "2026-09-17", "2026-12-31"), { from: "2026-09-14", to: "2026-09-20" });
  assert.deepEqual(periodRange("thang", "2026-10-20", "2026-10-05"), { from: "2026-10-01", to: "2026-10-05" }, "tháng đang chạy cắt ở hôm nay");
  assert.deepEqual(periodRange("quy", "2026-08-02", "2026-12-31"), { from: "2026-07-01", to: "2026-09-30" });
  assert.deepEqual(periodRange("nam", "2026-03-03", "2027-01-01"), { from: "2026-01-01", to: "2026-12-31" });
  assert.equal(shiftPeriod("thang", "2026-03-31", -1), "2026-02-01", "lùi tháng từ ngày 31 không nhảy sai tháng");
  assert.equal(shiftPeriod("quy", "2026-08-15", 1), "2026-10-01");
  assert.equal(periodLabel("quy", "2026-08-15"), "Quý 3/2026");
  assert.equal(periodLabel("tuan", "2026-09-17"), "Tuần 14/09 – 20/09/2026");
  assert.equal(seriesStep("thang"), "ngay");
  assert.equal(seriesStep("quy"), "tuan");
  assert.equal(seriesStep("nam"), "thang");
  assert.equal(isCurrentPeriod("thang", "2026-10-01", "2026-10-05"), true);

  // URL: tham số tiếng Việt; dòng xe bị bỏ khi chưa chọn hãng; mốc về đầu kỳ.
  const f = readPeriodFilter(new URLSearchParams("ky=quy&moc=2026-08-15&hang=H&dong=VR&xu_ly=s1"), "2026-10-05");
  assert.equal(f.unit, "quy");
  assert.equal(f.anchor, "2026-07-01");
  assert.equal(f.modelCode, "VR");
  assert.equal(readPeriodFilter(new URLSearchParams("dong=VR"), "2026-10-05").modelCode, null, "dòng xe cần có hãng");
  assert.equal(readPeriodFilter(new URLSearchParams("ky=xyz&moc=abc"), "2026-10-05").unit, "thang", "giá trị lạ về mặc định");
  const url = writePeriodFilter(f, new URLSearchParams("tab=phan-tich"));
  assert.equal(url.get("tab"), "phan-tich", "giữ tham số khác");
  assert.equal(url.get("hang"), "H");

  // Lọc hãng / dòng tính cả xe dùng chung.
  const base = {
    productId: "p", code: "A", name: "A", categoryId: "c1", categoryName: "N", isCombo: false, isActive: true, unitName: "Cái",
    brandCode: "H", modelCode: "V", sharedVehicles: [{ brandCode: "Y", modelCode: "AC" }], partCode: "12", stageId: "s1", stageName: "Xi",
    openingStock: 10, received: 5, sold: 8, internalOut: 0, returned: 0, adjusted: 0, closingStock: 7, receivedPrev: 0, soldPrev: 4,
  };
  const none = readPeriodFilter(new URLSearchParams(""), "2026-10-05");
  assert.equal(matchesPeriodFilter(base, { ...none, brandCode: "Y", modelCode: "AC" }), true, "khớp xe dùng chung");
  assert.equal(matchesPeriodFilter(base, { ...none, brandCode: "H", modelCode: "AC" }), false, "dòng phải cùng hãng");
  assert.equal(matchesPeriodFilter(base, { ...none, partCode: "13" }), false);

  const k = periodKpis([base, { ...base, productId: "q", sold: 0, soldPrev: 0, openingStock: 0, closingStock: 3 }], [
    { date: "2026-09-01", received: 5, sold: 8, internalOut: 0, receiptCount: 2, invoiceCount: 3 },
  ]);
  assert.equal(k.sold, 8);
  assert.equal(k.invoiceCount, 3);
  assert.equal(k.sellingProducts, 1);
  assert.equal(k.turnover, 8 / ((10 + 10) / 2), "vòng quay = xuất bán ÷ tồn bình quân");
  assert.equal(changeRatio(8, 4), 1);
  assert.equal(changeRatio(5, 0), null, "kỳ trước 0: không chia");
  assert.equal(hasActivity({ ...base, openingStock: 0, received: 0, sold: 0, closingStock: 0, soldPrev: 0 }), false);

  // Cơ cấu theo hãng chỉ tính cặp chính (không đếm một lần bán hai lần).
  const namer = { brand: (b: string) => (b === "H" ? "HONDA" : b), model: (_b: string, m: string) => m, part: (p: string) => p };
  assert.deepEqual(breakdown([base], "hang", namer), [{ key: "H", label: "HONDA", sold: 8, soldPrev: 4 }]);

  // Bảng xếp hạng theo kỳ.
  const r = (id: string, o: Partial<typeof base>) => ({ ...base, productId: id, code: id, ...o });
  const ranked = [
    r("B1", { sold: 50, soldPrev: 10, categoryId: "c1" }),
    r("B2", { sold: 30, soldPrev: 60, categoryId: "c2", categoryName: "M" }),
    r("B3", { sold: 0, soldPrev: 0, closingStock: 90 }),
    r("B4", { sold: 1, soldPrev: 1, closingStock: 400 }),
  ];
  assert.deepEqual(topProducts(ranked, 2).map((x) => x.code), ["B1", "B2"]);
  const cats = topCategories(ranked, 5);
  assert.equal(cats[0]?.sold, 51, "nhóm c1 = B1 + B4");
  assert.equal(cats[0]?.share, 51 / 81, "tỉ trọng trong tổng xuất bán");
  const mv = salesMovers(ranked, 5);
  assert.deepEqual(mv.up.map((x) => x.code), ["B1"]);
  assert.deepEqual(mv.down.map((x) => x.code), ["B2"]);
  assert.equal(mv.upCount, 1, "đếm đủ, không bị cắt top");
  const slow = slowStock(ranked, 30, 10);
  assert.deepEqual(slow.noSales.map((x) => x.code), ["B3"], "còn tồn, kỳ này không bán");
  assert.deepEqual(slow.overstock.map((x) => x.row.code), ["B4"], "400 ÷ (1/30) = 12.000 ngày ≥ 365");
  assert.equal(slow.noSalesQty, 90, "tổng tồn của mã không bán");
}

// --- 0117: quyền tích theo người (QUYEN-01/02) ------------------------------
{
  // Khóa = giá trị CHECK của nguoi_dung_quyen.quyen (0117) — đúng 9, đúng thứ tự yêu cầu.
  assert.deepEqual(
    BUSINESS_PERMISSIONS.map((p) => p.key),
    ["tao_tai_khoan", "phan_quyen", "tao_don", "xac_nhan_don", "nhap_kho",
     "tao_doi_tac", "tao_ma_hang", "xem_dashboard", "xem_phan_tich"],
  );
  assert.equal(Object.keys(SCOPE_LABELS).length, 4, "4 phạm vi = 4 vai trò cũ");
  assert.equal(isAdmin(as("quan_ly")), true);
  assert.equal(isAdmin(as("van_phong", BUSINESS_PERMISSIONS.map((p) => p.key))), false, "đủ 9 quyền vẫn không phải Admin");

  const base = { fullName: "An", jobTitleId: "11111111-1111-4111-8111-111111111111", role: "van_phong", warehouseIds: [] };
  const noPerms = editUserFormSchema.safeParse(base);
  assert.ok(noPerms.success && noPerms.data.permissions.length === 0, "mặc định không có quyền nào");
  assert.ok(!editUserFormSchema.safeParse({ ...base, permissions: ["kiem_kho"] }).success, "khóa cũ bị từ chối");

  // Form người dùng chọn CHỨC VỤ; phạm vi thủ kho vẫn bắt buộc có kho.
  const title = "11111111-1111-4111-8111-111111111111";
  assert.ok(!editUserFormSchema.safeParse({ fullName: "An", role: "van_phong", warehouseIds: [] }).success, "thiếu chức vụ");
  assert.ok(editUserFormSchema.safeParse({ fullName: "An", jobTitleId: title, role: "van_phong", warehouseIds: [] }).success);
  const noWarehouse = editUserFormSchema.safeParse({ fullName: "An", jobTitleId: title, role: "thu_kho", warehouseIds: [] });
  assert.ok(!noWarehouse.success && noWarehouse.error.issues[0].path[0] === "warehouseIds");
}

// --- Danh mục: chi tiết dạng dòng mở rộng (sửa PANEL-01, ảnh mẫu KiotViet) -
{
  // Sao chép: giữ mọi trường, mã để trống để người dùng gõ mã mới.
  const copied = copyProductDefaults({
    code: "HA26-33K-PC", name: "Hộc chứa đồ", categoryId: "c", unitId: "u", stageId: "s",
    conversion: 2, defaultWarehouseId: "k", minStock: 1, maxStock: 9, barcode: "123",
    description: "n", isActive: false, kind: "COMBO", directSale: false,
    shelfLocation: "A-1", brandCode: "H", modelCode: "A", partCode: "75", sharedVehicles: [], manualFields: [],
  });
  assert.equal(copied.code, "");
  assert.equal(copied.barcode, null, "barcode thường là duy nhất — không chép");
  assert.equal(copied.isActive, true, "mã mới luôn đang kinh doanh");
  assert.equal(copied.name, "Hộc chứa đồ");
  assert.equal(copied.kind, "COMBO");

  // Ghép số phân tích vào từng dòng bảng theo id sản phẩm.
  const map = forecastById([
    { productId: "a", customerOrdered: 3, avgDailySales: 1, daysOfCover: 4.2, stockoutDate: "2026-10-06", available: 4.2 },
    { productId: "b", customerOrdered: 0, avgDailySales: null, daysOfCover: null, stockoutDate: null, available: 9 },
  ], 30);
  // Cần đặt = ⌈1 × 30 − 4,2⌉ = 26 — cùng công thức Đề nghị nhập trang Phân tích.
  assert.deepEqual(map.get("a"), { customerOrdered: 3, stockoutDate: "2026-10-06", daysOfCover: 4.2, selling: true, toOrder: 26 });
  assert.equal(map.get("b")?.toOrder, 0, "không bán thì không cần đặt");
  assert.equal(map.get("b")?.selling, false, "không bán trong kỳ: hiện 'Không bán', không có ngày");
  assert.equal(map.get("zzz"), undefined);

  // Hàng nút: không có quyền Tạo mã hàng chỉ còn Xem chi tiết; mã ngừng KD có "Kinh doanh lại".
  assert.deepEqual(expandedActions({ canEdit: false, isActive: true }), ["detail"]);
  assert.deepEqual(expandedActions({ canEdit: true, isActive: true }), ["deactivate", "copy", "detail", "edit"]);
  assert.deepEqual(expandedActions({ canEdit: true, isActive: false }), ["reactivate", "copy", "detail", "edit"]);

  // Chi tiết mã → giá trị form: null thành giá trị rỗng form hiểu được.
  const form = toProductFormValues({
    code: "A", name: "B", categoryId: null, unitId: null, stageId: "s", conversion: 1,
    defaultWarehouseId: null, minStock: 0, maxStock: null, barcode: null, description: "d", isActive: true,
    kind: "HANG_HOA", directSale: true, shelfLocation: null,
    brandCode: "H", modelCode: null, partCode: null, sharedVehicles: [], manualFields: ["dong_xe"],
  });
  assert.equal(form.unitId, "", "ĐVT null → chuỗi rỗng để Select hiện ô trống");
  assert.deepEqual(form.manualFields, ["dong_xe"]);
  assert.equal(form.description, "d");

  assert.equal(standardFieldText("Air Blade", "A"), "Air Blade");
  assert.equal(standardFieldText(null, "ZZ"), "ZZ (không có trong bộ mã hóa)", "mã bị bỏ khỏi bộ mã hóa vẫn hiện");
  assert.equal(standardFieldText(null, null), null);
}

// --- Quy chuẩn mã hàng (C): tách mã như công thức TRA_CUU ---------------
{
  // Mảnh từ điển thật (sheet "Quy chuẩn mã", 10 cột) đủ cho 14 mã mẫu bên dưới.
  const dict = buildCodeDictionary([
    { brand: "HONDA", brandCode: "H", model: "Air Blade", modelCode: "A", part: "Mặt nạ", partCode: "75", finish: "xi", finishCode: "X", color: "đỏ bóng", colorCode: "ĐOB" },
    { brand: "HONDA", brandCode: "H", model: "Click", modelCode: "CL", part: "Ốp tay dắt sau", partCode: "20", finish: "carbon", finishCode: "CB", color: "CTS1022", colorCode: "CTS1022" },
    { brand: "HONDA", brandCode: "H", model: "PCX", modelCode: "P", part: "Ốp bầu lọc gió", partCode: "12", finish: "PC", finishCode: "PC", color: "CTS1024", colorCode: "CTS1024" },
    { brand: "HONDA", brandCode: "H", model: "SH", modelCode: "S", part: "Thùng chứa đồ sau", partCode: "68D", finish: "phôi PP", finishCode: "PPH", color: "", colorCode: "" },
    { brand: "YAMAHA", brandCode: "Y", model: "Exciter", modelCode: "E", part: "Ốp phuộc trước", partCode: "14", finish: "", finishCode: "", color: "", colorCode: "" },
    { brand: "YAMAHA", brandCode: "Y", model: "NVX", modelCode: "NX", part: "Chắn bùn sau (theo xe)", partCode: "35B", finish: "", finishCode: "", color: "", colorCode: "" },
    { brand: "VUTRU", brandCode: "VT", model: "Winner R", modelCode: "WNR", part: "Ốp chắn gió mặt đồng hồ", partCode: "03", finish: "inox", finishCode: "I", color: "", colorCode: "" },
  ]);
  // Mã | Hãng | Dòng | Linh kiện | Xử lý | Ghi chú. 12 mã đầu lấy nguyên từ file "Danh mục
  // hàng hóa.xlsx" (sinh bằng công thức TRA_CUU); 2 mã cuối tự dựng để phủ đường xử lý 3 ký tự (PPH).
  const cases: Array<[string, string, string, string, string, string]> = [
    ["HA26-75-35-WRG-CB", "HONDA", "Air Blade", "Mặt nạ", "carbon", "OK"],
    ["ha26-75-37-wrg-cb", "HONDA", "Air Blade", "Mặt nạ", "carbon", "OK"],
    ["64200K57V50ZE", "", "", "", "", "Mã không theo quy chuẩn (không có dấu -)"],
    ["VT-68DCTS1024-AS-PCĐO-CB", "VUTRU", "", "Thùng chứa đồ sau", "carbon", "Mã không ghi dòng xe."],
    ["EXT-155", "", "", "", "", "Hãng/dòng [EXT] không có trong quy chuẩn. Phần [155] không tách được linh kiện+màu. Không tìm được mã xử lý trong [155]."],
    ["YE15-03MLSĐOB", "YAMAHA", "Exciter", "", "", "Phần [03MLSĐOB] không tách được linh kiện+màu. Không tìm được mã xử lý trong [03MLSĐOB]."],
    ["HCL15-20X", "HONDA", "Click", "Ốp tay dắt sau", "xi", "OK (xử lý lấy từ ký tự cuối [X])"],
    ["HP18-12PCT", "HONDA", "PCX", "", "", "Phần [12PCT] không tách được linh kiện+màu. Không tìm được mã xử lý trong [12PCT]."],
    ["YNX-14X", "YAMAHA", "NVX", "Ốp phuộc trước", "xi", "OK (xử lý lấy từ ký tự cuối [X])"],
    ["YH-2-XC", "", "", "", "", "Hãng/dòng [YH] không có trong quy chuẩn. Phần [2] không tách được linh kiện+màu. Không tìm được mã xử lý trong [XC]."],
    ["YE15-35B", "YAMAHA", "Exciter", "Chắn bùn sau (theo xe)", "", "Không tìm được mã xử lý trong [35B]."],
    ["HS17-75-0201-K4", "HONDA", "SH", "Mặt nạ", "", "Không tìm được mã xử lý trong [K4]."],
    ["HA26-75ĐOB-PPH", "HONDA", "Air Blade", "Mặt nạ", "phôi PP", "OK"],
    // --RIGHT("N1.4",2) của Sheets coi ".4" là số → bỏ 2 ký tự "đời", khóa còn "N1".
    ["N1.4-6.3UNI", "", "", "", "inox", "Hãng/dòng [N1] không có trong quy chuẩn. Phần [6.3UN] không tách được linh kiện+màu."],
    ["HA-12CTS1024PPH", "HONDA", "Air Blade", "Ốp bầu lọc gió", "phôi PP", "OK (xử lý lấy từ ký tự cuối [PPH])"],
  ];
  for (const [code, brand, model, part, finish, note] of cases) {
    const r = parseProductCode(code, dict);
    assert.deepEqual([r.brand, r.model, r.part, r.finish, r.note], [brand, model, part, finish, note], code);
  }
  const ok = parseProductCode("HCL15-20X", dict);
  assert.equal(ok.status, "ok");
  assert.deepEqual([ok.brandCode, ok.modelCode, ok.partCode, ok.finishCode], ["H", "CL", "20", "X"]);
  const bad = parseProductCode("YE15-35B", dict);
  assert.equal(bad.status, "invalid");
  assert.deepEqual(bad.issues.map((i) => i.field), ["finish"], "chỉ đoạn xử lý lệch — giao diện tô đúng ô đó");

  // Sheet nguồn: đúng 10 tiêu đề mới đọc; ô có dấu phẩy trong ngoặc kép; dòng trống bỏ.
  const header = "1.HÃNG XE,MÃ HÓA,2.DÒNG XE,MÃ HÓA,4.LINH KIỆN,MÃ HÓA,5.XỬ LÝ,MÃ HÓA,6.MÀU,MÃ HÓA";
  const rows = readSourceSheet(`${header}\r\nHONDA,H,Air Blade,A,"Ốp, chắn bùn",01,xi,X,đỏ bóng,ĐOB\r\n,,,,,,,,,\r\n,,,,Mặt nạ,75,,,,\r\n`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].part, "Ốp, chắn bùn");
  assert.equal(rows[1].partCode, "75");
  assert.throws(() => readSourceSheet("1.HÃNG XE,MÃ HÓA,2.DÒNG XE\nHONDA,H,A"), SourceSheetError, "thiếu cột: dừng, không đọc bừa");
  assert.throws(
    () => readSourceSheet(header.replace("5.XỬ LÝ", "5.MÀU") + "\nHONDA,H,A,A,x,1,y,2,z,3"),
    /cột 7.*5\.XỬ LÝ/,
    "đổi tên/đổi chỗ cột: báo đúng cột",
  );

  // Đồng bộ: dòng sheet → mục từ điển (mỗi mã giữ lần xuất hiện ĐẦU TIÊN, như MATCH).
  const source = [
    { brand: "HONDA", brandCode: "H", model: "Air Blade", modelCode: "A", part: "Mặt nạ", partCode: "75", finish: "xi", finishCode: "X", color: "đỏ bóng", colorCode: "ĐOB" },
    { brand: "HONDA", brandCode: "H", model: "SH", modelCode: "S", part: "Mặt nạ  trùng", partCode: "75", finish: "", finishCode: "", color: "", colorCode: "" },
    { brand: "", brandCode: "", model: "Wave Thái", modelCode: "WT", part: "", partCode: "", finish: "", finishCode: "", color: "", colorCode: "" },
  ];
  const entries = toSyncEntries(source);
  assert.deepEqual(
    entries.map((e) => `${e.loai}:${e.ma_hang ?? ""}:${e.ma}:${e.ten}`),
    ["hang::H:HONDA", "dong:H:A:Air Blade", "linh_kien::75:Mặt nạ", "xu_ly::X:xi", "mau::ĐOB:đỏ bóng", "dong:H:S:SH"],
    "dòng thiếu mã hãng (Wave Thái) không tạo cặp — y như cột khóa của sheet CHUAN",
  );
  // Dựng lại từ điển từ DB phải tách mã y như dựng thẳng từ sheet.
  const fromDb = dictionaryFromEntries(entries);
  const fromSheet = buildCodeDictionary(source);
  for (const code of ["HA26-75ĐOB-X", "HS-75X", "HWT-75-X"]) {
    assert.deepEqual(parseProductCode(code, fromDb), parseProductCode(code, fromSheet), code);
  }
}

// --- Quy chuẩn mã (A): gõ mã tự điền, giữ ô chọn tay -----------------------
{
  const dict = buildCodeDictionary([
    { brand: "HONDA", brandCode: "H", model: "Air Blade", modelCode: "A", part: "Mặt nạ", partCode: "75", finish: "carbon", finishCode: "CB", color: "", colorCode: "" },
    { brand: "YAMAHA", brandCode: "Y", model: "Exciter", modelCode: "E", part: "Ốp bầu lọc gió", partCode: "12", finish: "xi", finishCode: "X", color: "", colorCode: "" },
  ]);
  const stages = [
    { id: "st-cb", standardCode: "CB" }, { id: "st-x", standardCode: "X" }, { id: "st-mn", standardCode: null },
  ];
  const empty = { brandCode: null, modelCode: null, partCode: null, stageId: "st-mn", manualFields: [] as string[] };

  // Mã đúng chuẩn: điền đủ 4 ô, cả 4 đánh dấu "tự điền".
  const r1 = applyCodeToStandardFields(parseProductCode("HA26-75-35-WRG-CB", dict), empty, stages, "st-mn");
  assert.deepEqual(
    [r1.brandCode, r1.modelCode, r1.partCode, r1.stageId, r1.autoFields],
    ["H", "A", "75", "st-cb", ["hang_xe", "dong_xe", "linh_kien", "xu_ly"]],
  );

  // Đổi sang mã khác: ô tự điền đi theo mã mới; ô CHỌN TAY giữ nguyên.
  const manual = { ...r1, partCode: "12", manualFields: ["linh_kien"] };
  const r2 = applyCodeToStandardFields(parseProductCode("YE15-75-X", dict), manual, stages, "st-mn");
  assert.deepEqual([r2.brandCode, r2.modelCode, r2.partCode, r2.stageId], ["Y", "E", "12", "st-x"], "linh kiện chọn tay giữ 12");
  assert.ok(!r2.autoFields.includes("linh_kien"));

  // Mã không tách được xử lý: công đoạn (bắt buộc) về "ngoài quy chuẩn" (Mua ngoài),
  // KHÔNG giữ xử lý tự điền của mã gõ trước — lưu sẽ ghi sai.
  const r3 = applyCodeToStandardFields(parseProductCode("YE15-12Z", dict), { ...r1, manualFields: [] }, stages, "st-mn");
  assert.equal(r3.stageId, "st-mn", "carbon của mã trước không được giữ lại");
  assert.ok(!r3.autoFields.includes("xu_ly"));
  assert.equal(r3.partCode, null, "phần [12Z] không tách được → linh kiện trống để chọn tay");

  // Chọn tay / bỏ chọn tay một ô.
  // Xử lý chọn tay thì mã không tách được vẫn giữ nguyên.
  const r4 = applyCodeToStandardFields(parseProductCode("YE15-12Z", dict), { ...r1, manualFields: ["xu_ly"] }, stages, "st-mn");
  assert.equal(r4.stageId, "st-cb");

  assert.deepEqual(toggleManual(["hang_xe"], "linh_kien", true), ["hang_xe", "linh_kien"]);
  assert.deepEqual(toggleManual(["hang_xe", "linh_kien"], "hang_xe", false), ["linh_kien"]);
  assert.deepEqual(toggleManual(["hang_xe"], "hang_xe", true), ["hang_xe"], "không trùng");

  // Bảng danh mục lưu mã → tra tên; dòng xe tra theo cặp hãng + dòng, không phân biệt hoa thường.
  assert.deepEqual(standardNames(dict, { brandCode: "h", modelCode: "a", partCode: "75" }), {
    brandName: "HONDA", modelName: "Air Blade", partName: "Mặt nạ",
  });
  assert.equal(standardNames(dict, { brandCode: "Y", modelCode: "A", partCode: null }).modelName, null, "A là dòng của Honda, không phải Yamaha");
  assert.deepEqual(standardNames(dict, { brandCode: null, modelCode: null, partCode: "ZZ" }), {
    brandName: null, modelName: null, partName: null,
  });

  // Điền quy chuẩn từ mã cho mã cũ: chỉ ô trống, không đụng ô chọn tay.
  const base = { name: "x", brandCode: null, modelCode: null, partCode: null, finishCode: null, manualFields: [] as string[] };
  const plan = planStandardFill(
    [
      { ...base, id: "1", code: "HA26-75-35-WRG-CB" }, // trống hết → điền 4 ô
      { ...base, id: "2", code: "HA26-75-CB", brandCode: "Y", finishCode: "X" }, // hãng + xử lý đã có → giữ
      { ...base, id: "3", code: "HA26-75-CB", manualFields: ["linh_kien", "xu_ly"] }, // chọn tay → bỏ qua
      { ...base, id: "4", code: "06410KFL850" }, // sai chuẩn, không tách được gì
      { ...base, id: "5", code: "HA26-75-CB", brandCode: "H", modelCode: "A", partCode: "75", finishCode: "CB" }, // đủ → không đổi
    ],
    dict,
    new Set(["CB", "X"]),
  );
  assert.equal(plan.total, 5);
  assert.equal(plan.validCount, 4);
  assert.deepEqual(plan.invalid.map((i) => i.code), ["06410KFL850"]);
  assert.equal(plan.invalid[0].reason, "Mã không theo quy chuẩn (không có dấu -)");
  assert.deepEqual(plan.changes, [
    { id: "1", brandCode: "H", modelCode: "A", partCode: "75", finishCode: "CB" },
    { id: "2", modelCode: "A", partCode: "75" },
    { id: "3", brandCode: "H", modelCode: "A" },
  ]);
  assert.deepEqual(plan.fieldCounts, { hang_xe: 2, dong_xe: 3, linh_kien: 2, xu_ly: 1 });
  // Mã xử lý chưa có công đoạn tương ứng → không gửi (RPC không gán được).
  const unknown = planStandardFill([{ ...base, id: "6", code: "HA26-75-CB" }], dict, new Set(["X"]));
  assert.equal(unknown.changes[0].finishCode, undefined);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
}

async function kiemTaiTheoTrang() {
  // PostgREST cắt mỗi lần gọi ở max_rows = 1000 (supabase/config.toml) — 3.266
  // mã phải tải nhiều trang. Hàm dừng khi trang trả về ít hơn kích thước trang.
  const goi: Array<[number, number]> = [];
  const all = await fetchAllPages(async (from, to) => {
    goi.push([from, to]);
    return Array.from({ length: Math.max(0, Math.min(to, 2499) - from + 1) }, (_, i) => from + i);
  }, 1000);
  assert.equal(all.length, 2500, "ghép đủ 2.500 dòng qua 3 trang");
  assert.deepEqual(goi, [[0, 999], [1000, 1999], [2000, 2999]], "gọi đúng ba khoảng, dừng ở trang thiếu");
  assert.equal((await fetchAllPages(async () => [], 1000)).length, 0, "không có dòng nào: một lần gọi, mảng rỗng");
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
  // Excel danh sách cần nhập: đúng 3 cột theo yêu cầu.
  assert.equal(header.replace(/^﻿/, ""), "Mã hàng,Tên hàng,Số lượng cần nhập");
  assert.ok(csv.includes("RWT,Hàng RWT,65"), "dòng RWT đề nghị 65");
}

// --- Phase 20 — tìm kiếm toàn cục (UI3B-02) ---------------------------------
{
  const row = (loai: string, id: string, nhan: string) =>
    ({ loai, id, nhan, phu: "Bạc đạn", loai_ct: null, trang_thai: null, xep_hang: 0 }) as unknown as Parameters<typeof toGlobalSearchResult>[0];
  assert.deepEqual(toGlobalSearchResult(row("san_pham", "p1", "ABC")), {
    key: "product:p1", kind: "product", id: "p1", label: "ABC", hint: "Bạc đạn", documentType: null, status: null, rank: 0,
  });
  assert.equal(toGlobalSearchResult(row("x", "p1", "ABC")), null, "loại lạ bị bỏ");

  const r = (kind: GlobalSearchResult["kind"], id: string, label = "L", documentType: string | null = null): GlobalSearchResult => ({
    key: `${kind}:${id}`, kind, id, label, hint: null, documentType, status: null, rank: 0,
  });
  assert.equal(searchResultHref(r("product", "p1")), "/danh-muc/p1");
  assert.equal(searchResultHref(r("order", "o1")), "/don-dat/o1");
  assert.equal(searchResultHref(r("partner", "x", "Liên Hoa")), "/doi-tac?q=Li%C3%AAn%20Hoa");
  assert.equal(searchResultHref(r("document", "d1", "L", "NHAP")), "/nhap-hang/d1");
  assert.equal(searchResultHref(r("document", "d1", "L", "XUAT")), "/duyet-don/d1");
  assert.equal(searchResultHref(r("document", "d1", "L", "TRA_NCC")), "/tra-hang/d1");
  assert.equal(searchResultHref(r("document", "d1", "L", "TRA_KHACH")), "/tra-hang/d1");
  assert.equal(searchResultHref(r("document", "d1", "L", "KIEM_KE")), "/kiem-ke/d1");
  assert.equal(searchResultHref(r("document", "d1", "L", "CHUYEN_KHO")), null);

  const groups = groupSearchResults([r("order", "o"), r("product", "p"), r("partner", "t")]);
  assert.deepEqual(groups.map((g) => g.title), ["Mã hàng", "Đơn đặt", "Đối tác"], "thứ tự nhóm, bỏ nhóm rỗng");
  assert.equal(defaultActiveIndex([{ label: "ABC1" }, { label: "ABC" }], " abc "), 1);
  assert.equal(defaultActiveIndex([{ label: "ABC1" }, { label: "ABD" }], "abc"), 0);
  assert.equal(defaultActiveIndex([], "abc"), -1);
}

// --- Phase 20 — tổng quan 3b (UI3B-03/04) -----------------------------------
{
  type OverviewDb = Parameters<typeof toOverviewKpis>[0];
  const overviewRow = (over: Partial<Record<string, unknown>> = {}) =>
    ({
      xem_gia_von: true, gia_tri_ton: 312500000, gia_tri_ton_thang_truoc: 305000000,
      tong_sl_ton: "9000", tong_sl_ton_thang_truoc: "8800", xu_huong_ton: ["1", 2],
      ma_kinh_doanh: 3000, ma_moi_thang: 3, xu_huong_ma_kd: [1, 2], phieu_xuat_tb_ngay: 4.2,
      cho_ghi_so: 5, cho_ghi_so_nhap: 3, cho_ghi_so_xuat: 2, cho_ghi_so_cu_nhat_ngay: 2, xu_huong_cho_ghi_so: [0, 5],
      ton_am_theo_kho: [{ ten_kho: "Kho 1", so_ma: 4 }], vi_du_duoi_dinh_muc: ["A", "B"],
      ...over,
    }) as unknown as OverviewDb;

  const k = toOverviewKpis(overviewRow());
  assert.deepEqual(k.pendingTrend, [0, 5], "xu_huong_cho_ghi_so ép về number[]");
  assert.deepEqual(k.negativeByWarehouse, [{ warehouseName: "Kho 1", count: 4 }]);
  assert.equal(k.oldestPendingDays, 2);
  assert.deepEqual(toOverviewKpis(overviewRow({ ton_am_theo_kho: { x: 1 } })).negativeByWarehouse, [], "jsonb không phải mảng → []");

  assert.equal(
    toStockByGroupRow({ nhom_id: null, ten_nhom: null, tong_ma: 1, con_hang: 1, het_hang: 0, am: 0, duoi_dinh_muc: 0, tong_so_luong: "120.5" } as unknown as Parameters<typeof toStockByGroupRow>[0]).totalQuantity,
    120.5,
  );
  assert.deepEqual(
    toFlowDay({ ngay: "2092-03-09", so_phieu_nhap: 2, so_phieu_xuat: 0, sl_nhap: "10", sl_xuat: "0" } as unknown as Parameters<typeof toFlowDay>[0]),
    { date: "2092-03-09", receiptCount: 2, issueCount: 0, receiptQuantity: 10, issueQuantity: 0 },
  );
  assert.equal(vsYesterdayLabel(12, 9), "Hôm qua 9 · ▲ +3");
  assert.equal(vsYesterdayLabel(5, 0), "Hôm qua 0 · ▲ +5", "hôm qua 0 không chia");
  assert.equal(vsYesterdayLabel(7, 10), "Hôm qua 10 · ▼ −3");
  assert.equal(vsYesterdayLabel(4, 4), "Bằng hôm qua (4)");
  assert.equal(averageIssuesLabel(4.2), "TB 4,2 phiếu/ngày");
  assert.equal(oldestPendingLabel(null), "Không có phiếu chờ");
  assert.equal(oldestPendingLabel(0), "Cũ nhất hôm nay");
  assert.equal(oldestPendingLabel(2), "Cũ nhất 2 ngày");
  assert.equal(pendingBreakdownLabel(5, 3, 2), "3 phiếu nhập · 2 phiếu xuất");
  assert.equal(pendingBreakdownLabel(6, 3, 2), "3 phiếu nhập · 2 phiếu xuất · 1 phiếu trả");
  assert.equal(
    negativeByWarehouseLabel([{ warehouseName: "Kho 1", count: 4 }, { warehouseName: "Kho 2", count: 2 }]),
    "Kho 1: 4 mã · Kho 2: 2 mã",
  );
  assert.equal(negativeByWarehouseLabel([]), "Không có");
  const share = groupShare([{ key: "a", totalQuantity: 75 }, { key: "b", totalQuantity: 25 }]);
  assert.equal(share.get("a"), 75);
  assert.equal(share.get("b"), 25);
  assert.equal(groupShare([{ key: "a", totalQuantity: 0 }]).get("a"), 0, "tổng 0 → 0%");
  assert.equal(formatUpdatedAt(Date.UTC(2026, 8, 19, 1, 42)), "Cập nhật 08:42 · 19/09/2026");
}

// --- Phase 20 — đơn đặt 3b (UI3B-05/06) -------------------------------------
{
  assert.deepEqual(
    toOrderStatusCounts([{ trang_thai: "TAM", so_don: 2 }, { trang_thai: "HOAN_THANH", so_don: "5" }] as unknown as Parameters<typeof toOrderStatusCounts>[0]),
    { byStatus: { TAM: 2, DA_XAC_NHAN: 0, HOAN_THANH: 5, DA_HUY: 0 }, total: 7 },
  );
  assert.deepEqual(
    toAddOrderLineResult({ dong_id: "l1", da_cong_don: true, so_luong_moi: "5" } as unknown as Parameters<typeof toAddOrderLineResult>[0]),
    { lineId: "l1", merged: true, quantity: 5 },
  );

  const staff = "11111111-1111-4111-8111-111111111111";
  const countArgs = toOrderStatusCountRpcArgs({ ...DEFAULT_ORDER_FILTER, statuses: ["TAM"], page: 3, recipientKind: "internal", staffId: staff });
  assert.deepEqual(countArgs, {
    p_doi_tac_id: undefined, p_tu_ngay: undefined, p_den_ngay: undefined, p_tu_khoa: undefined,
    p_loai_nhan: "NOI_BO", p_nguoi_nhan_id: staff,
  });
  assert.ok(!("p_trang_thai" in countArgs) && !("p_trang" in countArgs) && !("p_kich_thuoc" in countArgs));
  assert.deepEqual(
    statusCountKeyOf({ ...DEFAULT_ORDER_FILTER, statuses: ["TAM"], page: 3 }),
    statusCountKeyOf({ ...DEFAULT_ORDER_FILTER, statuses: ["TAM", "HOAN_THANH"], page: 1 }),
    "đổi trạng thái/trang không đổi khóa đếm",
  );

  // Trạng thái nhiều lựa chọn: mặc định ẩn Đã hủy, không ghi lên URL; tích đủ = không lọc.
  {
    const def = readOrderFilterFromUrl(new URLSearchParams(""));
    assert.deepEqual(def.statuses, ["TAM", "DA_XAC_NHAN", "HOAN_THANH"]);
    assert.equal(writeOrderFilterToUrl(def).get("trang_thai"), null);
    assert.deepEqual(toOrderListRpcArgs(def).p_trang_thai, ["TAM", "DA_XAC_NHAN", "HOAN_THANH"]);
    const all = readOrderFilterFromUrl(new URLSearchParams("trang_thai=DA_HUY,TAM,HOAN_THANH,DA_XAC_NHAN"));
    assert.deepEqual(all.statuses, ["TAM", "DA_XAC_NHAN", "HOAN_THANH", "DA_HUY"], "giữ thứ tự chuẩn");
    assert.equal(toOrderListRpcArgs(all).p_trang_thai, undefined);
    assert.deepEqual(readOrderFilterFromUrl(new URLSearchParams("trang_thai=xyz")).statuses, def.statuses);
  }
  assert.deepEqual(toAddOrderLineRpcArgs("o1", { productId: "p1", quantity: 2, recipientId: null }), {
    p_don_id: "o1", p_san_pham_id: "p1", p_so_luong: 2, p_nguoi_nhan_id: undefined,
  });
  assert.equal(toAddOrderLineRpcArgs("o1", { productId: "p1", quantity: 2, recipientId: "nv" }).p_nguoi_nhan_id, "nv");

  assert.equal(todayInVietnam(new Date(Date.UTC(2026, 9, 3, 18, 30))), "2026-10-04", "01:30 sáng VN");
  assert.deepEqual(datePresetRange("7d", "2026-10-04"), { fromDate: "2026-09-28", toDate: "2026-10-04" });
  assert.deepEqual(datePresetRange("30d", "2026-10-04"), { fromDate: "2026-09-05", toDate: "2026-10-04" });
  assert.deepEqual(datePresetRange("month", "2026-10-04"), { fromDate: "2026-10-01", toDate: "2026-10-04" });
  // Bộ lọc danh sách: URL chưa chọn ngày → tháng này; tháng này không tính là đang lọc.
  assert.deepEqual(readDateRangeOrThisMonth(new URLSearchParams(""), readDate, "2026-10-05"), { fromDate: "2026-10-01", toDate: "2026-10-05" });
  assert.deepEqual(readDateRangeOrThisMonth(new URLSearchParams("tu_ngay=01/09/2026"), readDate, "2026-10-05"), { fromDate: null, toDate: null }, "có tham số sai thì không tự thay");
  assert.equal(isDefaultDateRange("2026-10-01", "2026-10-05", "2026-10-05"), true);
  assert.equal(isDefaultDateRange("2026-09-01", "2026-09-30", "2026-10-05"), false);
  assert.deepEqual(datePresetRange("7d", "2026-03-03"), { fromDate: "2026-02-25", toDate: "2026-03-03" });
  assert.equal(activeDatePreset(null, null, "2026-10-04"), null);
  assert.equal(activeDatePreset("2026-09-28", "2026-10-04", "2026-10-04"), "7d");
  assert.equal(activeDatePreset("2026-10-01", "2026-10-04", "2026-10-04"), "month");
  assert.equal(activeDatePreset("2026-09-01", "2026-09-15", "2026-10-04"), "custom");
  assert.deepEqual(DATE_PRESET_LABELS, { "7d": "7N", "30d": "30N", month: "Tháng", custom: "Tùy" });

  assert.deepEqual(orderProgress(0, 0), { percent: null, label: "—" });
  assert.deepEqual(orderProgress(3, 7), { percent: 43, label: "3/7" });
  assert.deepEqual(orderProgress(400, 400), { percent: 100, label: "400/400" });
  assert.deepEqual(orderProgress(1500, 2000), { percent: 75, label: "1.500/2.000" });
  assert.equal(orderProgress(9, 7).percent, 100);
}

void Promise.all([kiemCsvLoi(), kiemCsvPhanTich(), kiemTaiTheoTrang()]).then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});

// --- Nhập chứng từ từ Excel (0104) ------------------------------------------
{
assert.equal(parseDateCell("03/10/2026"), "2026-10-03");
assert.equal(parseDateCell("2026-10-03"), "2026-10-03");
assert.equal(parseDateCell(new Date(Date.UTC(2026, 9, 3))), "2026-10-03");
assert.equal(parseDateCell(46298), "2026-10-03", "số serial Excel");
assert.equal(parseDateCell("31/02/2026"), null, "ngày không có thật");
assert.equal(parseQuantityCell("1.200"), 1200, "dấu chấm phân nghìn");
assert.equal(parseQuantityCell("1,5"), 1.5);
assert.equal(parseQuantityCell("abc"), null);
assert.equal(parseRecipientKind("Nội bộ"), "NOI_BO");
assert.equal(parseRecipientKind("Đối tác"), "DOI_TAC");
assert.deepEqual(splitStaffNames("NGỌC - QUỲNH"), ["NGỌC", "QUỲNH"]);
assert.deepEqual(parseNegativeReason("Lệch tồn, chờ kiểm kê", { LECH_TON_CHO_KIEM_KE: "Lệch tồn, chờ kiểm kê" }), { code: "LECH_TON_CHO_KIEM_KE", note: null });
assert.deepEqual(parseNegativeReason("hàng gửi trước", {}), { code: "KHAC", note: "hàng gửi trước" });

const h = mapHeaders("hoa-don", ["ma_dat_hang", "ma_hoa_don", "ngay", "kho_khong_can_de_kho_nao", "ma_hang", "tong_so_luong", "so_luong"]);
assert.equal(h.warehouse, "kho_khong_can_de_kho_nao", "tiền tố");
assert.equal(h.quantity, "so_luong", "không ăn nhầm tong_so_luong");
assert.equal(h.orderNo, "ma_dat_hang");
const p = mapHeaders("phieu-nhap", ["ma_nhap_hang", "ngay_nhap", "ma_ncc", "ghi_chu_phieu", "ma_hang", "so_luong", "ghi_chu_dong"]);
assert.equal(p.note, "ghi_chu_phieu");
assert.equal(p.lineNote, "ghi_chu_dong");
assert.equal(mapHeaders("phieu-nhap", ["nguoi_nhap", "nguoi_tao"]).receiver, "nguoi_nhap");

const row = (o: Partial<DocumentFileRow>): DocumentFileRow => ({
  row: 2, docNo: "HD1", orderNo: "", date: "2026-10-03", dateRaw: "03/10/2026", dueDate: null, recipientKind: "",
  partnerCode: "NB001", staff: "", source: "", warehouse: "", note: "", productCode: "A", quantity: 1, quantityRaw: "1",
  lineNote: "", negativeReason: "", receiver: "", ...o,
});
const g = groupDocuments([
  row({ row: 2, staff: "NGỌC" }),
  row({ row: 3, productCode: "B", quantity: 2, quantityRaw: "2", staff: "QUỲNH - NGỌC" }),
  row({ row: 4, docNo: "HD2", quantity: null, quantityRaw: "x" }),
  row({ row: 5, docNo: "" }),
], {});
assert.equal(g.documents.length, 2);
assert.deepEqual(g.documents[0]?.nhan_vien, ["NGỌC", "QUỲNH"], "gộp nhân viên, không trùng");
assert.equal(g.documents[0]?.dong.length, 2);
assert.equal(g.documents[0]?.dong_dau, 2);
assert.deepEqual(g.issues.map((i) => i.row), [4, 5]);
const headerOnly = groupDocuments([row({ productCode: "", quantity: null, quantityRaw: "" })], {});
assert.equal(headerOnly.documents[0]?.dong.length, 0, "dòng trống mã + số lượng = chỉ sửa đầu phiếu");
}

// --- Nhập đối tác từ Excel (0109) -------------------------------------------
{
  assert.deepEqual(parsePartnerKind("Đối tác"), { kind: "DOI_TAC", dbKind: null });
  assert.deepEqual(parsePartnerKind("noi bo"), { kind: "NOI_BO", dbKind: null });
  // Chữ cũ của KiotViet: giữ loại database, loại hiển thị suy theo mã.
  assert.deepEqual(parsePartnerKind("Nhà cung cấp"), { kind: null, dbKind: "NCC" });
  assert.deepEqual(parsePartnerKind("khách hàng"), { kind: null, dbKind: "KHACH" });
  assert.deepEqual(parsePartnerKind("Cả hai"), { kind: null, dbKind: "CA_HAI" });
  assert.equal(parsePartnerKind(""), null);
  assert.equal(parsePartnerKind("đại lý"), "INVALID");
  assert.equal(parseActiveFlag(1), true, "file KiotViet ghi 1 / 0");
  assert.equal(parseActiveFlag(0), false);
  assert.equal(parseActiveFlag("Không"), false);
  assert.equal(parseActiveFlag(null), null);
  assert.equal(parseActiveFlag("có lẽ"), "INVALID");
  const h = mapPartnerHeaders(["ma_nha_cung_cap", "ten_nha_cung_cap", "loai", "dang_hoat_dong", "nguoi_tao"]);
  assert.equal(h.code, "ma_nha_cung_cap");
  assert.equal(h.name, "ten_nha_cung_cap");
  assert.equal(h.isActive, "dang_hoat_dong");
}

// --- Hoạt động gần đây (0116) -----------------------------------------------
{
  const base = { key: "k", at: "2026-10-07T07:00:00Z", targetId: "id-1", code: "DH1", detail: null, count: 1, viaImport: false, actor: "An" } as const;
  assert.deepEqual(activityPhrase({ ...base, kind: "DON_DAT", action: "xac_nhan" }), { verb: "xác nhận", object: "đơn" });
  assert.deepEqual(activityPhrase({ ...base, kind: "NHAP", action: "ghi_so", count: 86, targetId: null, code: null }), { verb: "ghi sổ", object: "86 phiếu nhập" });
  assert.deepEqual(activityPhrase({ ...base, kind: "SAN_PHAM", action: "tao", count: 24, viaImport: true }), { verb: "nhập Excel", object: "24 mã hàng" });
  assert.equal(activityHref({ ...base, kind: "NHAP", action: "tao" }), "/nhap-hang/id-1");
  assert.equal(activityHref({ ...base, kind: "DOI_TAC", action: "sua" }), "/doi-tac?chon=id-1");
  assert.equal(activityHref({ ...base, kind: "NHAP", action: "ghi_so", count: 5, targetId: null }), "/nhap-hang", "gộp nhiều phiếu → danh sách");
  assert.equal(activityHref({ ...base, kind: "CHUYEN_KHO", action: "tao" }), null, "chưa có màn chuyển kho");
  const now = new Date(2026, 9, 7, 15, 0);
  assert.equal(activityTime(new Date(2026, 9, 7, 14, 55).toISOString(), now), "5 phút trước");
  assert.equal(activityTime(new Date(2026, 9, 6, 9, 5).toISOString(), now), "Hôm qua 09:05");
  assert.equal(activityTime(new Date(2026, 9, 3, 8, 0).toISOString(), now), "03/10 08:00");
}
