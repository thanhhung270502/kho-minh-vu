import { hasPermission, type Permission, type Role } from "@/shared/lib/permissions";

export type MucTabCaiDat = { duongDan: string; label: string; quyen: Permission };

/**
 * Danh sách tab + hàm chọn tab mặc định để ở module THUẦN (không `"use client"`).
 *
 * Trước đây cả hai nằm trong `components/tab-cai-dat.tsx` — file client — nên
 * `src/app/(app)/cai-dat/page.tsx` (Server Component) gọi `tabDauTien()` là
 * Next.js ném ngay: "Attempted to call tabDauTien() from the server but
 * tabDauTien is on the client". Bấm menu Cài đặt ra trang lỗi (UAT Phase 2).
 */
export const TAB_CAI_DAT: MucTabCaiDat[] = [
  { duongDan: "/cai-dat/nguoi-dung", label: "Người dùng", quyen: "manage-users" },
  { duongDan: "/cai-dat/kho", label: "Kho", quyen: "manage-warehouses" },
  { duongDan: "/cai-dat/nhom-hang", label: "Nhóm hàng", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/don-vi-tinh", label: "Đơn vị tính", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/cong-doan", label: "Công đoạn", quyen: "manage-lookups" },
  { duongDan: "/cai-dat/so-chung-tu", label: "Số chứng từ", quyen: "manage-doc-numbering" },
];

export function tabCuaVaiTro(role: Role): MucTabCaiDat[] {
  return TAB_CAI_DAT.filter((t) => hasPermission(role, t.quyen));
}

export function tabDauTien(role: Role): string {
  return tabCuaVaiTro(role)[0]?.duongDan ?? "/cai-dat/nhom-hang";
}
