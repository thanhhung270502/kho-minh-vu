import type { BoLocDoiTac, LoaiDoiTac } from "../types";

export const khoaDoiTac = {
  tatCa: ["doi-tac"] as const,
  danhSach: (b: BoLocDoiTac) => ["doi-tac", "danh-sach", b] as const,
  chiTiet: (id: string) => ["doi-tac", "chi-tiet", id] as const,
  lichSu: (id: string, trang: number) => ["doi-tac", "lich-su", id, trang] as const,
  maGoiY: (loai: LoaiDoiTac) => ["doi-tac", "ma-goi-y", loai] as const,
};
