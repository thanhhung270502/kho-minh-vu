import type { Database } from "@/types/database.types";

export type LoaiDoiTac = Database["public"]["Enums"]["loai_doi_tac"];
export type DongDoiTac =
  Database["public"]["Functions"]["danh_sach_doi_tac"]["Returns"][number];
export type ChiTietDoiTac = Database["public"]["Tables"]["doi_tac"]["Row"];
export type DongLichSuGiaoDich =
  Database["public"]["Functions"]["lich_su_giao_dich_doi_tac"]["Returns"][number];

export const NHAN_LOAI_DOI_TAC: Record<LoaiDoiTac, string> = {
  NCC: "Nhà cung cấp",
  KHACH: "Khách hàng",
  CA_HAI: "Cả hai",
};

export const MAU_LOAI_DOI_TAC: Record<LoaiDoiTac, string> = {
  NCC: "blue",
  KHACH: "green",
  CA_HAI: "purple",
};

export type BoLocDoiTac = {
  q: string;
  loai: LoaiDoiTac | null;
  hoatDong: "dang" | "ngung" | "tat_ca";
  trang: number;
};

export const BO_LOC_DOI_TAC_MAC_DINH: BoLocDoiTac = {
  q: "",
  loai: null,
  hoatDong: "dang",
  trang: 1,
};

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm kiếm (ô tìm nằm ngoài panel). */
export function demDieuKienDoiTac(b: BoLocDoiTac): number {
  let dem = 0;
  if (b.loai !== null) dem++;
  if (b.hoatDong !== BO_LOC_DOI_TAC_MAC_DINH.hoatDong) dem++;
  return dem;
}
