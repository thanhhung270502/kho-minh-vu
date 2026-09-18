import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

export type DongSanPham = Fn["danh_sach_san_pham"]["Returns"][number];
export type ChiTietSanPham = Fn["chi_tiet_san_pham"]["Returns"][number];
export type DongTheKho = Fn["the_kho_san_pham"]["Returns"][number];
export type GoiYCongDoan = Fn["goi_y_cong_doan_theo_duoi"]["Returns"][number];

export type MucDanhMucPhu = { id: string; ma: string; ten: string };
export type MucCongDoan = MucDanhMucPhu & { mau_hien_thi: string | null };

export type DanhMucPhu = {
  nhomHang: MucDanhMucPhu[];
  donViTinh: MucDanhMucPhu[];
  congDoan: MucCongDoan[];
  kho: MucDanhMucPhu[];
};

export type TrangDuLieu<T> = { dong: T[]; tong: number };

/**
 * Trường ghi được của mã hàng. `gia_von` KHÔNG có ở đây: chỉ trigger giá vốn ghi
 * cột đó, client không có quyền (migration 0015 + 0029).
 */
export type SanPhamInput = Pick<
  Database["public"]["Tables"]["san_pham"]["Insert"],
  | "ma_hang"
  | "ten_hang"
  | "nhom_hang_id"
  | "dvt_id"
  | "cong_doan_id"
  | "quy_doi"
  | "kho_mac_dinh_id"
  | "ton_toi_thieu"
  | "ton_toi_da"
  | "gia_ban"
  | "barcode"
  | "ghi_chu"
  | "dang_kinh_doanh"
>;

export type TonTheoKho = { kho_id: string; ten_kho: string; so_luong: number };
