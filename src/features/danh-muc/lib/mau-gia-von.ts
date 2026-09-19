/**
 * Mẫu Excel giá vốn đầu kỳ — chỉ hai cột. File này KHÔNG import `node:` nên
 * Client Component dùng được để hiện tên cột trong bảng lỗi.
 */
export const COT_GIA_VON = [
  { khoa: "ma_hang", tieuDe: "Mã hàng", rong: 22 },
  { khoa: "gia_von", tieuDe: "Giá vốn", rong: 16 },
] as const;

export type DongGiaVon = { ma_hang: string | null; gia_von: number | null };

export type KetQuaGiaVon = {
  da_nap: boolean;
  dat: number;
  bo_qua: number;
  so_loi: number;
  chi_tiet_dat: Array<{ ma_hang: string; gia_von: number }>;
  chi_tiet_bo_qua: Array<{ ma_hang: string; gia_von_hien_tai: number; ly_do: string }>;
  loi: Array<{ ma_hang: string; ly_do: string }>;
};
