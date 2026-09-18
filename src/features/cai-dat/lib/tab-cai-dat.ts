import { coQuyen, type Quyen, type VaiTro } from "@/shared/lib/quyen";

export type MucTabCaiDat = { duongDan: string; nhan: string; quyen: Quyen };

/**
 * Danh sách tab + hàm chọn tab mặc định để ở module THUẦN (không `"use client"`).
 *
 * Trước đây cả hai nằm trong `components/tab-cai-dat.tsx` — file client — nên
 * `src/app/(app)/cai-dat/page.tsx` (Server Component) gọi `tabDauTien()` là
 * Next.js ném ngay: "Attempted to call tabDauTien() from the server but
 * tabDauTien is on the client". Bấm menu Cài đặt ra trang lỗi (UAT Phase 2).
 */
export const TAB_CAI_DAT: MucTabCaiDat[] = [
  { duongDan: "/cai-dat/nguoi-dung", nhan: "Người dùng", quyen: "cai_dat_nguoi_dung" },
  { duongDan: "/cai-dat/kho", nhan: "Kho", quyen: "cai_dat_kho" },
  { duongDan: "/cai-dat/nhom-hang", nhan: "Nhóm hàng", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/don-vi-tinh", nhan: "Đơn vị tính", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/cong-doan", nhan: "Công đoạn", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/so-chung-tu", nhan: "Số chứng từ", quyen: "cai_dat_so_chung_tu" },
];

export function tabCuaVaiTro(vaiTro: VaiTro): MucTabCaiDat[] {
  return TAB_CAI_DAT.filter((t) => coQuyen(vaiTro, t.quyen));
}

export function tabDauTien(vaiTro: VaiTro): string {
  return tabCuaVaiTro(vaiTro)[0]?.duongDan ?? "/cai-dat/nhom-hang";
}
