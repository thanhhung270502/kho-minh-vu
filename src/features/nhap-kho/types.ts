import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

export type DongDanhSachPhieu = Fn["danh_sach_chung_tu"]["Returns"][number];
export type ChiTietPhieu = Fn["chi_tiet_chung_tu"]["Returns"][number];
export type DongPhieu = Fn["dong_chung_tu"]["Returns"][number];

export type NguonNhap = Database["public"]["Enums"]["nguon_nhap"];
export type TrangThaiCt = Database["public"]["Enums"]["trang_thai_ct"];

export const NHAN_NGUON_NHAP: Record<NguonNhap, string> = {
  NCC: "NCC ngoài",
  NHA_MAY: "Nhà máy",
};

export const MAU_NGUON_NHAP: Record<NguonNhap, string> = {
  NCC: "blue",
  NHA_MAY: "purple",
};

export const NHAN_TRANG_THAI: Record<TrangThaiCt, string> = {
  NHAP_LIEU: "Đang nhập liệu",
  HOAN_THANH: "Đã ghi sổ",
  DA_HUY: "Đã hủy",
};

export const MAU_TRANG_THAI: Record<TrangThaiCt, string | undefined> = {
  NHAP_LIEU: "gold",
  HOAN_THANH: "green",
  DA_HUY: undefined,
};

export type QuyenPhieuNhap = {
  /** Tạo phiếu, thêm dòng, ghi sổ. */
  sua: boolean;
  /** Hủy phiếu đã ghi sổ — chỉ quản lý (D-11). */
  huy: boolean;
};
