import type { BoLocPhieu } from "../schemas/phieu-nhap.schema";

export const khoaPhieuNhap = {
  tatCa: ["phieu-nhap"] as const,
  danhSach: (b: BoLocPhieu) => ["phieu-nhap", "danh-sach", b] as const,
  chiTiet: (id: string) => ["phieu-nhap", "chi-tiet", id] as const,
  dong: (id: string) => ["phieu-nhap", "dong", id] as const,
};
