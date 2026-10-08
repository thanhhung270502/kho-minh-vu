import { describe, expect, it } from "vitest";
import {
  BUSINESS_PERMISSIONS,
  type BusinessPermission,
  type PermissionSubject,
  type Role,
} from "@/shared/lib/permissions";
import {
  filterNavItems,
  splitMobileItems,
  buildNavEntries,
  NAV_ITEMS,
} from "@/shared/lib/navigation";

/** Bộ quyền mẫu (0117): Admin luôn đủ 9 quyền (quyen_cua_toi), nhân viên theo người tích. */
const DEFAULT_TITLE: Record<Role, BusinessPermission[]> = {
  quan_ly: BUSINESS_PERMISSIONS.map((p) => p.key),
  van_phong: ["nhap_kho", "tao_don", "xac_nhan_don", "tao_ma_hang"],
  thu_kho: ["nhap_kho"],
  chi_xem: [],
};
const as = (
  role: Role,
  extra: BusinessPermission[] = [],
): PermissionSubject => ({
  role,
  permissions: [...DEFAULT_TITLE[role], ...extra],
});

describe("navigation", () => {
  it("màn Lịch sử KiotViet đã gỡ khỏi menu (Phase 10, GON-02)", () => {
    {
      expect(
        !NAV_ITEMS.some((i) => i.href === "/lich-su-kiotviet"),
        "không còn mục menu /lich-su-kiotviet",
      ).toBeTruthy();
      expect(
        filterNavItems(as("quan_ly"), NAV_ITEMS).some(
          (i) => i.href === "/kiem-ke",
        ),
        "filterNavItems chỉ cần vai trò",
      ).toBeTruthy();
    }
  });

  it("filterNavItems / splitMobileItems theo vai trò (06-16)", () => {
    {
      const thuKhoItems = filterNavItems(as("thu_kho"), NAV_ITEMS);
      expect(
        thuKhoItems.some((i) => i.href === "/kiem-ke"),
        "thủ kho thấy /kiem-ke",
      ).toBeTruthy();
      expect(
        !thuKhoItems.some((i) => i.href === "/"),
        "thủ kho không có quyền view-dashboard nên không thấy mục Tổng quan (07-04)",
      ).toBeTruthy();

      const vanPhongItems = filterNavItems(as("van_phong"), NAV_ITEMS);
      expect(
        vanPhongItems.some((i) => i.href === "/kiem-ke"),
        "văn phòng thấy /kiem-ke",
      ).toBeTruthy();
      expect(
        !vanPhongItems.some((i) => i.href === "/"),
        "văn phòng không thấy mục Tổng quan",
      ).toBeTruthy();

      const quanLyItems = filterNavItems(as("quan_ly"), NAV_ITEMS);
      expect(
        quanLyItems.some((i) => i.href === "/kiem-ke") &&
          quanLyItems.some((i) => i.href === "/cai-dat") &&
          quanLyItems.some((i) => i.href === "/"),
        "quản lý thấy /kiem-ke, /cai-dat và Tổng quan",
      ).toBeTruthy();

      const chiXemItems = filterNavItems(as("chi_xem"), NAV_ITEMS);
      expect(
        chiXemItems.some((i) => i.href === "/kiem-ke") &&
          !chiXemItems.some((i) => i.href === "/cai-dat"),
        "chỉ xem thấy /kiem-ke nhưng không thấy /cai-dat",
      ).toBeTruthy();
      expect(
        !chiXemItems.some((i) => i.href === "/"),
        "chỉ xem không thấy mục Tổng quan",
      ).toBeTruthy();

      const { primary } = splitMobileItems(thuKhoItems);
      expect(
        !primary.some((i) => i.href === "/"),
        "thanh tab đáy của thủ kho không còn ô Tổng quan trỏ vòng (07-04, mất quyền view-dashboard)",
      ).toBeTruthy();
      expect(
        primary.map((i) => i.href),
        "mất ô Tổng quan thì mục ưu tiên 5 (Đơn đặt) đôn lên lấp đủ 4 ô; Danh sách hàng hóa thay ô Tồn kho",
      ).toStrictEqual(["/duyet-don", "/nhap-hang", "/danh-muc", "/don-dat"]);
    }
  });

  it("menu nhóm Đơn hàng / Hàng hóa (Phase 10, GON-04/06)", () => {
    {
      expect(
        !NAV_ITEMS.some((i) => i.href === "/ton-kho"),
        "không còn mục /ton-kho",
      ).toBeTruthy();
      expect(
        !NAV_ITEMS.some((i) => i.href === "/xuat-kho"),
        "không còn mục /xuat-kho",
      ).toBeTruthy();
      expect(
        !NAV_ITEMS.some((i) => i.href === "/dat-hang" || i.href === "/hoa-don"),
        "Phase 17: không còn mục /dat-hang, /hoa-don",
      ).toBeTruthy();

      const entries = buildNavEntries(filterNavItems(as("quan_ly"), NAV_ITEMS));
      expect(
        entries.map((e) => e.label),
        "thứ tự menu cấp 1 của quản lý (Phase 13 thêm Phân tích)",
      ).toStrictEqual([
        "Tổng quan",
        "Hàng hóa",
        "Đơn hàng",
        "Nhập hàng",
        "Đối tác",
        "Phân tích",
        "Cài đặt",
      ]);
      const groupHrefs = (label: string) => {
        const entry = entries.find((e) => e.label === label);
        return entry?.kind === "group" ? entry.items.map((i) => i.href) : null;
      };
      expect(groupHrefs("Đơn hàng")).toStrictEqual(["/don-dat", "/duyet-don"]);
      const orders = entries.find((e) => e.label === "Đơn hàng");
      expect(
        orders?.kind === "group"
          ? orders.items.map((i) => [i.label, i.shortLabel])
          : null,
        "TEN-01: menu và thanh tab đáy dùng tên mới",
      ).toStrictEqual([
        ["Đơn đặt", "Đơn đặt"],
        ["Duyệt đơn", "Duyệt đơn"],
      ]);
      expect(groupHrefs("Hàng hóa")).toStrictEqual(["/danh-muc", "/kiem-ke"]);
      const goods = entries.find((e) => e.label === "Hàng hóa");
      expect(goods?.kind === "group" ? goods.items[0]?.label : null).toBe(
        "Danh sách hàng hóa",
      );

      const chiXem = buildNavEntries(filterNavItems(as("chi_xem"), NAV_ITEMS));
      expect(
        chiXem.map((e) => e.label),
        "chỉ xem không có Tổng quan, Cài đặt",
      ).toStrictEqual(["Hàng hóa", "Đơn hàng", "Nhập hàng", "Đối tác"]);
      expect(
        buildNavEntries(
          filterNavItems(as("thu_kho", ["xem_phan_tich"]), NAV_ITEMS),
        ).some((e) => e.label === "Phân tích"),
        "0117: tích Xem trang Phân tích thì thấy menu",
      ).toBeTruthy();
      expect(
        !buildNavEntries(filterNavItems(as("van_phong"), NAV_ITEMS)).some(
          (e) => e.label === "Phân tích",
        ),
        "0117: chưa tích Xem trang Phân tích thì không thấy",
      ).toBeTruthy();
    }
  });
});
