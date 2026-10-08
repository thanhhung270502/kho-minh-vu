import { describe, expect, it } from "vitest";
import {
  BUSINESS_PERMISSIONS,
  type BusinessPermission,
  type PermissionSubject,
  type Role,
} from "@/shared/lib/permissions";
import { homePathFor } from "@/features/dashboard/lib/home-path";

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

describe("homePathFor", () => {
  it("trang chủ theo vai trò + quyền xem dashboard (Phase 7, 07-04; Phase 16)", () => {
    expect(homePathFor(as("quan_ly"))).toBe("/");
    // Phase 10: Xuất kho thành Hóa đơn, Phase 17: Hóa đơn → Duyệt đơn (/duyet-don), trang Tồn kho gỡ — tra tồn ở Danh sách hàng hóa.
    expect(homePathFor(as("van_phong"))).toBe("/duyet-don");
    expect(homePathFor(as("thu_kho"))).toBe("/danh-muc");
    expect(homePathFor(as("chi_xem"))).toBe("/danh-muc");
    // Phase 16: trang chủ theo quyền "Xem dashboard" — tắt cho quản lý không được
    // chuyển hướng về chính "/" (vòng lặp vô hạn); bật cho thủ kho thì về "/".
    expect(homePathFor({ role: "quan_ly", permissions: [] })).toBe(
      "/duyet-don",
    );
    expect(homePathFor(as("thu_kho", ["xem_dashboard"]))).toBe("/");
  });
});
