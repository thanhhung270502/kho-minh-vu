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
import { fetchAllPages } from "../src/shared/lib/fetch-all-pages";
import { isInteractiveTarget, readSelectedId, withSelectedId } from "../src/shared/lib/selected-id";
import { docTypeLabel, toPartnerRow } from "../src/features/partners/types";
import { BUSINESS_PERMISSIONS, SCOPE_LABELS, allows, type BusinessPermission, type PermissionSubject, type Role } from "../src/shared/lib/permissions";
import { jobTitleSchema, titleCodeFromName } from "../src/features/settings/schemas/job-title.schema";
import { editUserFormSchema } from "../src/features/settings/schemas/user.schema";
import { duplicateProblemsInFile } from "../src/features/products/lib/new-product-file";
import {
  copyProductDefaults,
  expandedActions,
  forecastById,
  stockLimitLabel,
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
import { toAnalysisRow, type AnalysisRow, type AnalysisSettings } from "../src/features/analytics/types";
import {
  buildReorderCsv,
  coverBucket,
  finishOf,
  visibleCoverBuckets,
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
  COMMON_GOODS_LABEL,
  DEFAULT_RECIPIENT_KIND,
  RECIPIENT_KIND_ORDER,
  formatOrderRecipients,
  isMultiRecipientOrder,
  lineRecipientLabel,
  partnerLabel,
  recipientDisplayName,
  recipientKindOf,
  staffNames,
  toStaffRefs,
} from "../src/shared/lib/recipient";
import { SETTINGS_TABS, firstTabFor, tabsFor } from "../src/features/settings/lib/settings-tabs";
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
import { homePathFor } from "../src/features/dashboard/lib/home-path";
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


/** Người dùng giữ chức vụ MẶC ĐỊNH của vai trò — đúng dữ liệu 0082. */
const DEFAULT_TITLE: Record<Role, BusinessPermission[]> = {
  quan_ly: ["xem_dashboard", "nhap_kho", "tao_don", "xac_nhan_don", "hoan_thanh_don", "sua_hoa_don", "tao_ma_hang", "tao_nhan_vien", "kiem_kho"],
  van_phong: ["nhap_kho", "tao_don", "hoan_thanh_don", "tao_ma_hang", "tao_nhan_vien", "kiem_kho"],
  thu_kho: ["nhap_kho", "kiem_kho"],
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
assert.equal(allows(as("van_phong"), ["manage-users", "tao_nhan_vien"]), true, "mảng = có một trong các quyền");
assert.equal(allows(as("thu_kho"), ["manage-users", "tao_nhan_vien"]), false);

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
    barcode: null, note: null, isActive: true,
    productTypeId: "11111111-1111-4111-8111-111111111111",
    vehicleLineId: "22222222-2222-4222-8222-222222222222",
    directSale: false, shelfLocation: "A-01",
  } satisfies ProductInput;
  const payload = toProductInsert(input);
  assert.ok(!("gia_ban" in payload), "payload ghi mã hàng không có gia_ban");
  assert.ok(!("gia_von" in payload), "payload ghi mã hàng không có gia_von");
  // Phase 15 (IMP-05): ba trường mới + vị trí kệ đi đúng cột.
  assert.equal(payload.loai_hang_id, input.productTypeId);
  assert.equal(payload.dong_xe_id, input.vehicleLineId);
  assert.equal(payload.duoc_ban_truc_tiep, false);
  assert.equal(payload.vi_tri_ke, "A-01");
  const keys = TEMPLATE_COLUMNS.map((c) => c.key as string);
  assert.ok(!keys.includes("gia_ban") && !keys.includes("gia_von"), "mẫu Excel không có cột giá");
}

// Phase 11 (NVPT-01/02): đặt hàng mặc định Nội bộ, Nội bộ đứng trước; tab
// Nhân viên phụ trách cho quản lý + văn phòng; tên viết tắt + đầy đủ bắt buộc.
{
  assert.equal(DEFAULT_RECIPIENT_KIND, "internal", "tạo đơn mặc định chế độ Nội bộ");
  assert.deepEqual(RECIPIENT_KIND_ORDER, ["internal", "partner"], "Nội bộ đứng trước Đối tác");

  const nvpt = "/cai-dat/nhan-vien-phu-trach";
  assert.ok(tabsFor(as("van_phong")).some((t) => t.duongDan === nvpt), "văn phòng có tab Nhân viên phụ trách");
  assert.ok(tabsFor(as("quan_ly")).some((t) => t.duongDan === nvpt), "quản lý có tab Nhân viên phụ trách");
  assert.ok(!tabsFor(as("thu_kho")).some((t) => t.duongDan === nvpt), "thủ kho không có tab này");
  // Phase 16: tab theo quyền Tạo nhân viên — bật cho Thủ kho thì thủ kho có tab, và có menu Cài đặt.
  assert.ok(tabsFor(as("thu_kho", ["tao_nhan_vien"])).some((t) => t.duongDan === nvpt));
  assert.ok(filterNavItems(as("thu_kho", ["tao_nhan_vien"]), NAV_ITEMS).some((i) => i.href === "/cai-dat"));
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
    ["/duyet-don", "/nhap-kho", "/danh-muc", "/don-dat"],
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
    ["Tổng quan", "Đơn hàng", "Nhập kho", "Hàng hóa", "Đối tác", "Phân tích", "Cài đặt"],
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
    ["Đơn hàng", "Nhập kho", "Hàng hóa", "Đối tác"],
    "chỉ xem không có Tổng quan, Cài đặt",
  );
  assert.ok(
    buildNavEntries(filterNavItems(as("van_phong"), NAV_ITEMS)).some((e) => e.label === "Phân tích"),
    "văn phòng thấy Phân tích (đi đặt hàng NCC)",
  );
  assert.ok(
    !buildNavEntries(filterNavItems(as("thu_kho"), NAV_ITEMS)).some((e) => e.label === "Phân tích"),
    "thủ kho không thấy Phân tích (tồn mọi kho)",
  );
}

const sampleFilter: ProductFilter = {
  q: "op po",
  categoryId: "11111111-1111-4111-8111-111111111111",
  stageId: null,
  unitId: null,
  stockStatus: "duoi_dinh_muc",
  tradingStatus: "inactive",
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
// Phase 17 (TEN-05): bỏ "Cần rà" — bookmark cũ ?can_ra=1 bị bỏ qua, RPC không nhận p_can_ra.
assert.deepEqual(readFilterFromUrl(new URLSearchParams("can_ra=1")), DEFAULT_PRODUCT_FILTER, "?can_ra=1 cũ bị bỏ qua");
assert.ok(!("p_can_ra" in toListRpcArgs(DEFAULT_PRODUCT_FILTER)), "không gửi p_can_ra");
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
assert.equal(formatOrderRecipients({ partner: null, staff: [staffAn, staffBinh] }), "Nội bộ — An, Bình");
assert.equal(formatOrderRecipients({ partner: null, staff: [] }), "—");
assert.equal(formatOrderRecipients({ partner: partnerLienHoa, staff: [] }), "KH01 Liên Hoa");
assert.equal(formatOrderRecipients({ partner: partnerLienHoa, staff: [staffAn] }), "KH01 Liên Hoa · An");
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
  assert.equal(b({ avgDailySales: null }), "no-data", "còn tồn, không bán: chưa đủ dữ liệu");
  assert.equal(b({ stock: 0, avgDailySales: null }), null, "không tồn, không bán: không đưa vào biểu đồ");
  assert.equal(b({ stock: 0, avgDailySales: 1, daysOfCover: 0 }), "out");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 14 }), "le-x", "<= X (ngưỡng vàng)");
  assert.equal(b({ avgDailySales: 1, daysOfCover: 30 }), "x-30");
  assert.deepEqual(
    visibleCoverBuckets({ ...ANALYSIS_SETTINGS, yellowDays: 30 }).includes("x-30"),
    false,
    "ngưỡng vàng >= 30: không còn khoảng X+1..30, bỏ cột đó (tránh nhãn '31–30')",
  );
  assert.equal(visibleCoverBuckets(ANALYSIS_SETTINGS).length, 7);
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
      { row: 2, code: "A", name: "Áo", stock: 3, description: "d", problems: [] },
      { row: 3, code: "B", name: "Bé", stock: 0, description: "", problems: ["Tồn kho không phải là số"] },
      { row: 4, code: "C", name: "Cá", stock: 1, description: "", problems: [] },
    ],
    { unitId: cai },
  );
  assert.equal(drafts[0].unitId, cai, "ĐVT mặc định CAI");
  assert.equal(drafts[0].isActive && drafts[0].directSale, true, "mặc định đang KD + bán trực tiếp");

  // Áp hàng loạt chỉ đổi đúng dòng đã chọn, không đụng mảng gốc.
  const applied = applyToRows(drafts, [2, 4], { productTypeId: lh, directSale: false });
  assert.deepEqual(applied.map((r) => r.productTypeId), [lh, null, lh]);
  assert.deepEqual(applied.map((r) => r.directSale), [false, true, false]);
  assert.equal(drafts[0].productTypeId, null, "không sửa mảng gốc");

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
  const clean = applyToRows(drafts, [4], { vehicleLineId: lh, shelfLocation: " K-1 " });
  const payload = toImportPayload(clean, new Map([[3, ["x"]]]));
  assert.deepEqual(payload.map((p) => p.dong), [2, 4], "bỏ dòng đang lỗi");
  assert.deepEqual(payload[1], {
    dong: 4, ma_hang: "C", ten_hang: "Cá", ton_kho: 1, ghi_chu: "",
    dvt_id: cai, nhom_hang_id: null, loai_hang_id: null, dong_xe_id: lh,
    dang_kinh_doanh: true, duoc_ban_truc_tiep: true, vi_tri_ke: "K-1",
  });
}

// --- Phase 16: chức vụ & quyền (QUYEN-01/02) ------------------------------
{
  // Khóa = giá trị CHECK của chuc_vu_quyen.quyen (0082) — đúng 9, đúng thứ tự yêu cầu.
  assert.deepEqual(
    BUSINESS_PERMISSIONS.map((p) => p.key),
    ["xem_dashboard", "nhap_kho", "tao_don", "xac_nhan_don", "hoan_thanh_don",
     "sua_hoa_don", "tao_ma_hang", "tao_nhan_vien", "kiem_kho"],
  );
  assert.equal(BUSINESS_PERMISSIONS[1].label, "Nhập đơn hàng");
  assert.equal(Object.keys(SCOPE_LABELS).length, 4, "4 phạm vi = 4 vai trò cũ");

  assert.equal(titleCodeFromName("  Kế toán kho "), "KE_TOAN_KHO");
  assert.equal(titleCodeFromName("Đội giao-hàng 2"), "DOI_GIAO_HANG_2");
  const ok = jobTitleSchema.safeParse({ name: "  Kế toán ", scope: "van_phong" });
  assert.ok(ok.success && ok.data.name === "Kế toán");
  assert.ok(!jobTitleSchema.safeParse({ name: " ", scope: "van_phong" }).success, "tên bắt buộc");

  // Form người dùng chọn CHỨC VỤ; phạm vi thủ kho vẫn bắt buộc có kho.
  const title = "11111111-1111-4111-8111-111111111111";
  assert.ok(!editUserFormSchema.safeParse({ fullName: "An", role: "van_phong", warehouseIds: [] }).success, "thiếu chức vụ");
  assert.ok(editUserFormSchema.safeParse({ fullName: "An", jobTitleId: title, role: "van_phong", warehouseIds: [] }).success);
  const noWarehouse = editUserFormSchema.safeParse({ fullName: "An", jobTitleId: title, role: "thu_kho", warehouseIds: [] });
  assert.ok(!noWarehouse.success && noWarehouse.error.issues[0].path[0] === "warehouseIds");
}

// --- Danh mục: chi tiết dạng dòng mở rộng (sửa PANEL-01, ảnh mẫu KiotViet) -
{
  assert.equal(stockLimitLabel(0, null), "0 – không giới hạn");
  assert.equal(stockLimitLabel(5, 1200), "5 – 1.200");

  // Sao chép: giữ mọi trường, mã để trống để người dùng gõ mã mới.
  const copied = copyProductDefaults({
    code: "HA26-33K-PC", name: "Hộc chứa đồ", categoryId: "c", unitId: "u", stageId: "s",
    conversion: 2, defaultWarehouseId: "k", minStock: 1, maxStock: 9, barcode: "123",
    note: "n", isActive: false, productTypeId: "t", vehicleLineId: "v", directSale: false,
    shelfLocation: "A-1",
  });
  assert.equal(copied.code, "");
  assert.equal(copied.barcode, null, "barcode thường là duy nhất — không chép");
  assert.equal(copied.isActive, true, "mã mới luôn đang kinh doanh");
  assert.equal(copied.name, "Hộc chứa đồ");
  assert.equal(copied.vehicleLineId, "v");

  // Ghép số phân tích vào từng dòng bảng theo id sản phẩm.
  const map = forecastById([
    { productId: "a", customerOrdered: 3, avgDailySales: 1, daysOfCover: 4.2, stockoutDate: "2026-10-06" },
    { productId: "b", customerOrdered: 0, avgDailySales: null, daysOfCover: null, stockoutDate: null },
  ]);
  assert.deepEqual(map.get("a"), { customerOrdered: 3, stockoutDate: "2026-10-06", daysOfCover: 4.2, selling: true });
  assert.equal(map.get("b")?.selling, false, "không bán trong kỳ: hiện 'Không bán', không có ngày");
  assert.equal(map.get("zzz"), undefined);

  // Hàng nút: không có quyền Tạo mã hàng chỉ còn Xem chi tiết; mã ngừng KD có "Kinh doanh lại".
  assert.deepEqual(expandedActions({ canEdit: false, isActive: true }), ["detail"]);
  assert.deepEqual(expandedActions({ canEdit: true, isActive: true }), ["deactivate", "copy", "detail", "edit"]);
  assert.deepEqual(expandedActions({ canEdit: true, isActive: false }), ["reactivate", "copy", "detail", "edit"]);

  // Chi tiết mã → giá trị form: null thành giá trị rỗng form hiểu được.
  const form = toProductFormValues({
    code: "A", name: "B", categoryId: null, unitId: null, stageId: "s", conversion: 1,
    defaultWarehouseId: null, minStock: 0, maxStock: null, barcode: null, note: null, isActive: true,
    productTypeId: null, vehicleLineId: "v", directSale: true, shelfLocation: null,
  });
  assert.equal(form.unitId, "", "ĐVT null → chuỗi rỗng để Select hiện ô trống");
  assert.equal(form.vehicleLineId, "v");
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
  assert.ok(header.includes("Đề nghị nhập") && header.includes("Mã hàng"), "CSV đề nghị nhập có tiêu đề tiếng Việt");
  assert.ok(!/giá|vốn/i.test(header), "CSV đề nghị nhập không có cột giá");
  assert.ok(header.includes("Đơn đặt") && !header.includes("Khách đặt"), "TEN-03: CSV ghi Đơn đặt thay Khách đặt");
  assert.ok(csv.includes("RWT") && csv.includes(",65"), "dòng RWT đề nghị 65");
}

void Promise.all([kiemCsvLoi(), kiemCsvPhanTich(), kiemTaiTheoTrang()]).then(() => {
  console.log("✓ hàm thuần: tất cả assert đạt");
});
