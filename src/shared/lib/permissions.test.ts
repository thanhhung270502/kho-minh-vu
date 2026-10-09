import { describe, expect, it } from "vitest";
import {
  hasPermission,
  BUSINESS_PERMISSIONS,
  SCOPE_LABELS,
  allows,
  isAdmin,
  type BusinessPermission,
  type PermissionSubject,
  type Role,
} from "@/shared/lib/permissions";
import { editUserFormSchema } from "@/features/settings/schemas/user.schema";

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

describe("permissions", () => {
  it("hasPermission theo phạm vi vai trò", () => {
    expect(hasPermission("thu_kho", "view-catalog")).toBe(true);
    expect(hasPermission("thu_kho", "edit-catalog")).toBe(false);
    expect(hasPermission("van_phong", "manage-users")).toBe(false);
  });

  it("allows theo quyền chức vụ (Phase 16)", () => {
    // Phase 16: Tổng quan theo quyền chức vụ "Xem dashboard", không theo vai trò.
    expect(allows(as("quan_ly"), "xem_dashboard")).toBe(true);
    expect(allows(as("van_phong"), "xem_dashboard")).toBe(false);
    expect(
      allows(as("thu_kho", ["xem_dashboard"]), "xem_dashboard"),
      "bật cho Thủ kho thì thủ kho xem được",
    ).toBe(true);
    expect(
      allows(as("chi_xem"), "view-catalog"),
      "quyền theo phạm vi vẫn đọc vai trò",
    ).toBe(true);
    expect(
      allows(as("van_phong", ["phan_quyen"]), ["manage-users", "phan_quyen"]),
      "mảng = có một trong các quyền",
    ).toBe(true);
    expect(allows(as("thu_kho"), ["manage-users", "phan_quyen"])).toBe(false);
  });

  it("quyền tích theo người (0117, QUYEN-01/02)", () => {
    {
      // Khóa = giá trị CHECK của nguoi_dung_quyen.quyen (0117) — đúng 9, đúng thứ tự yêu cầu.
      expect(BUSINESS_PERMISSIONS.map((p) => p.key)).toStrictEqual([
        "tao_tai_khoan",
        "phan_quyen",
        "tao_don",
        "xac_nhan_don",
        "nhap_kho",
        "tao_doi_tac",
        "tao_ma_hang",
        "xem_dashboard",
        "xem_phan_tich",
      ]);
      expect(Object.keys(SCOPE_LABELS).length, "4 phạm vi = 4 vai trò cũ").toBe(
        4,
      );
      expect(isAdmin(as("quan_ly"))).toBe(true);
      expect(
        isAdmin(
          as(
            "van_phong",
            BUSINESS_PERMISSIONS.map((p) => p.key),
          ),
        ),
        "đủ 9 quyền vẫn không phải Admin",
      ).toBe(false);

      const base = {
        fullName: "An",
        jobTitleId: "11111111-1111-4111-8111-111111111111",
        role: "van_phong",
        warehouseIds: [],
      };
      const noPerms = editUserFormSchema.safeParse(base);
      expect(
        noPerms.success && noPerms.data.permissions.length === 0,
        "mặc định không có quyền nào",
      ).toBeTruthy();
      expect(
        !editUserFormSchema.safeParse({ ...base, permissions: ["kiem_kho"] })
          .success,
        "khóa cũ bị từ chối",
      ).toBeTruthy();

      // Form người dùng chọn CHỨC VỤ; phạm vi thủ kho vẫn bắt buộc có kho.
      const title = "11111111-1111-4111-8111-111111111111";
      expect(
        !editUserFormSchema.safeParse({
          fullName: "An",
          role: "van_phong",
          warehouseIds: [],
        }).success,
        "thiếu chức vụ",
      ).toBeTruthy();
      expect(
        editUserFormSchema.safeParse({
          fullName: "An",
          jobTitleId: title,
          role: "van_phong",
          warehouseIds: [],
        }).success,
      ).toBeTruthy();
      const noWarehouse = editUserFormSchema.safeParse({
        fullName: "An",
        jobTitleId: title,
        role: "thu_kho",
        warehouseIds: [],
      });
      expect(
        !noWarehouse.success &&
          noWarehouse.error.issues[0].path[0] === "warehouseIds",
      ).toBeTruthy();
    }
  });
});
