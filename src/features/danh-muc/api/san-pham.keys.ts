import type { BoLocSanPham } from "../schemas/bo-loc.schema";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const khoaSanPham = {
  tatCa: ["san-pham"] as const,
  danhSach: (b: BoLocSanPham) => ["san-pham", "danh-sach", b] as const,
  chiTiet: (id: string) => ["san-pham", "chi-tiet", id] as const,
  theKho: (id: string, khoId: string | null, trang: number) =>
    ["san-pham", "the-kho", id, khoId, trang] as const,
  tonTheoKho: (id: string) => ["san-pham", "ton-theo-kho", id] as const,
  goiYCongDoan: ["san-pham", "goi-y-cong-doan"] as const,
  danhMucPhu: ["danh-muc-phu"] as const,
};
