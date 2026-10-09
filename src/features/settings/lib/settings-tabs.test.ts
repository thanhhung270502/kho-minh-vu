import { describe, expect, it } from "vitest";
import {
  BUSINESS_PERMISSIONS,
  type BusinessPermission,
  type PermissionSubject,
  type Role,
} from "@/shared/lib/permissions";
import {
  SETTINGS_TABS,
  firstTabFor,
  tabsFor,
} from "@/features/settings/lib/settings-tabs";
import { staffSchema } from "@/shared/schemas/staff.schema";
import { filterNavItems, NAV_ITEMS } from "@/shared/lib/navigation";

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

describe("settings-tabs", () => {
  it("tab Nhân viên phụ trách và staffSchema (Phase 11, NVPT-01/02)", () => {
    {
      const nvpt = "/cai-dat/nhan-vien-phu-trach";
      expect(
        !tabsFor(as("van_phong")).some((t) => t.duongDan === nvpt),
        "0117: nhân viên không có tab Nhân viên phụ trách",
      ).toBeTruthy();
      expect(
        !tabsFor(as("quan_ly")).some((t) => t.duongDan === nvpt),
        "08/10/2026: tab Nhân viên phụ trách ẩn với mọi người",
      ).toBeTruthy();
      expect(
        !tabsFor(as("thu_kho")).some((t) => t.duongDan === nvpt),
        "thủ kho không có tab này",
      ).toBeTruthy();
      // 0117: tab Nhân viên phụ trách chỉ Admin; quyền Phân quyền mở menu Cài đặt (tab Người dùng).
      expect(
        !tabsFor(as("thu_kho", ["phan_quyen"])).some(
          (t) => t.duongDan === nvpt,
        ),
      ).toBeTruthy();
      expect(
        tabsFor(as("thu_kho", ["phan_quyen"])).some(
          (t) => t.duongDan === "/cai-dat/nguoi-dung",
        ),
      ).toBeTruthy();
      expect(
        filterNavItems(as("thu_kho", ["phan_quyen"]), NAV_ITEMS).some(
          (i) => i.href === "/cai-dat",
        ),
      ).toBeTruthy();
      expect(
        filterNavItems(as("thu_kho", ["xem_dashboard"]), NAV_ITEMS).some(
          (i) => i.href === "/",
        ),
      ).toBeTruthy();

      const ok = staffSchema.safeParse({
        shortName: "  An ",
        fullName: " Nguyễn Văn An ",
        isActive: true,
      });
      expect(
        ok.success &&
          ok.data.shortName === "An" &&
          ok.data.fullName === "Nguyễn Văn An",
        "cắt khoảng trắng hai đầu",
      ).toBeTruthy();
      const bad = staffSchema.safeParse({
        shortName: " ",
        fullName: "",
        isActive: true,
      });
      expect(!bad.success, "tên viết tắt và tên đầy đủ bắt buộc").toBeTruthy();
      expect(
        bad.success ? [] : bad.error.issues.map((i) => i.path[0]).sort(),
        "lỗi gắn đúng từng ô",
      ).toStrictEqual(["fullName", "shortName"]);
    }
  });

  it("Nhóm hàng / ĐVT / Công đoạn rời Cài đặt (Phase 11, NVPT-04)", () => {
    {
      for (const old of [
        "/cai-dat/nhom-hang",
        "/cai-dat/don-vi-tinh",
        "/cai-dat/cong-doan",
      ]) {
        expect(
          !SETTINGS_TABS.some((t) => t.duongDan === old),
          `Cài đặt không còn ${old}`,
        ).toBeTruthy();
      }
      expect(
        firstTabFor(as("van_phong")),
        "không có tab nào thì về Người dùng",
      ).toBe("/cai-dat/nguoi-dung");
      expect(firstTabFor(as("quan_ly"))).toBe("/cai-dat/nguoi-dung");
    }
  });
});
