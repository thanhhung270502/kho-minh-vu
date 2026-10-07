import { allows, type AnyPermission, type PermissionSubject } from "@/shared/lib/permissions";

/** Mảng = cần MỘT trong các quyền. */
export type SettingsTab = { duongDan: string; label: string; quyen: AnyPermission | readonly AnyPermission[] };

/**
 * Danh sách tab + hàm chọn tab mặc định để ở module THUẦN (không `"use client"`).
 *
 * Trước đây cả hai nằm trong `components/settings-tabs.tsx` — file client — nên
 * `src/app/(app)/cai-dat/page.tsx` (Server Component) gọi `firstTabFor()` là
 * Next.js ném ngay: "Attempted to call firstTabForRole() from the server but
 * firstTabForRole is on the client". Bấm menu Cài đặt ra page lỗi (UAT Phase 2).
 */
export const SETTINGS_TABS: SettingsTab[] = [
  // Quyền theo từng người (0117) — tab Chức vụ bỏ, tích quyền ngay trong tài khoản.
  { duongDan: "/cai-dat/nguoi-dung", label: "Người dùng", quyen: ["tao_tai_khoan", "phan_quyen"] },
  { duongDan: "/cai-dat/kho", label: "Kho", quyen: "manage-warehouses" },
  { duongDan: "/cai-dat/nhan-vien-phu-trach", label: "Nhân viên phụ trách", quyen: "manage-users" },
  // Tab "Số chứng từ" (/cai-dat/so-chung-tu) đã ẩn — trang vẫn còn, vào bằng đường dẫn.
];

export function tabsFor(user: PermissionSubject): SettingsTab[] {
  return SETTINGS_TABS.filter((t) => allows(user, t.quyen));
}

/** Quyền để vào /cai-dat: có ít nhất một tab. */
export const SETTINGS_ANY_PERMISSION: AnyPermission[] = SETTINGS_TABS.flatMap((t) => (typeof t.quyen === "string" ? [t.quyen] : [...t.quyen]));

// Nhóm hàng / ĐVT / Công đoạn rời Cài đặt ở Phase 11 — quản lý bằng nút "Danh
// mục phụ" ở Danh sách hàng hóa. Tab ít quyền nhất còn lại là Nhân viên phụ trách.
export function firstTabFor(user: PermissionSubject): string {
  return tabsFor(user)[0]?.duongDan ?? "/cai-dat/nhan-vien-phu-trach";
}
