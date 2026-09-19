import { hasPermission, type Permission, type Role } from "@/shared/lib/permissions";

export type SettingsTab = { duongDan: string; label: string; quyen: Permission };

/**
 * Danh sách tab + hàm chọn tab mặc định để ở module THUẦN (không `"use client"`).
 *
 * Trước đây cả hai nằm trong `components/settings-tabs.tsx` — file client — nên
 * `src/app/(app)/cai-dat/page.tsx` (Server Component) gọi `firstTabForRole()` là
 * Next.js ném ngay: "Attempted to call firstTabForRole() from the server but
 * firstTabForRole is on the client". Bấm menu Cài đặt ra page lỗi (UAT Phase 2).
 */
export const SETTINGS_TABS: SettingsTab[] = [
  { duongDan: "/cai-dat/nguoi-dung", label: "Người dùng", quyen: "manage-users" },
  { duongDan: "/cai-dat/kho", label: "Kho", quyen: "manage-warehouses" },
  { duongDan: "/cai-dat/nhom-hang", label: "Nhóm hàng", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/don-vi-tinh", label: "Đơn vị tính", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/cong-doan", label: "Công đoạn", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/so-chung-tu", label: "Số chứng từ", quyen: "manage-doc-numbering" },
];

export function tabsForRole(role: Role): SettingsTab[] {
  return SETTINGS_TABS.filter((t) => hasPermission(role, t.quyen));
}

export function firstTabForRole(role: Role): string {
  return tabsForRole(role)[0]?.duongDan ?? "/cai-dat/nhom-hang";
}
