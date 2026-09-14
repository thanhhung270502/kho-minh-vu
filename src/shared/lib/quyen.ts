// Ma trận này CHỈ quyết định ẩn/hiện giao diện. Chặn thật nằm ở RLS — sửa
// quyền phải sửa migration trước.
import type { Database } from "@/types/database.types";

export type VaiTro = Database["public"]["Enums"]["vai_tro"];

export type Quyen =
  | "xem_danh_muc"
  | "sua_danh_muc"
  | "xem_gia_von"
  | "sua_gia_ban"
  | "cai_dat_danh_muc_phu"
  | "cai_dat_nguoi_dung"
  | "cai_dat_kho"
  | "cai_dat_so_chung_tu";

const MA_TRAN: Record<Quyen, readonly VaiTro[]> = {
  xem_danh_muc: ["quan_ly", "van_phong", "thu_kho", "chi_xem"],
  sua_danh_muc: ["quan_ly", "van_phong"],
  xem_gia_von: ["quan_ly", "van_phong"],
  sua_gia_ban: ["quan_ly"],
  cai_dat_danh_muc_phu: ["quan_ly", "van_phong"],
  cai_dat_nguoi_dung: ["quan_ly"],
  cai_dat_kho: ["quan_ly"],
  cai_dat_so_chung_tu: ["quan_ly"],
};

export function coQuyen(vaiTro: VaiTro | null | undefined, quyen: Quyen): boolean {
  return !!vaiTro && MA_TRAN[quyen].includes(vaiTro);
}

export const NHAN_VAI_TRO: Record<VaiTro, string> = {
  quan_ly: "Quản lý",
  van_phong: "Văn phòng",
  thu_kho: "Thủ kho",
  chi_xem: "Chỉ xem",
};
