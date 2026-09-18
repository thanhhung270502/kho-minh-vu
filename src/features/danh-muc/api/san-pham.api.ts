import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

import {
  thamSoRpc,
  type BoLocSanPham,
} from "../schemas/bo-loc.schema";
import type {
  ChiTietSanPham,
  DanhMucPhu,
  DongSanPham,
  DongTheKho,
  GoiYCongDoan,
  MucCongDoan,
  MucDanhMucPhu,
  SanPhamInput,
  TonTheoKho,
  TrangDuLieu,
} from "../types";

/**
 * Migration 0029 thu quyền đọc mức bảng của `san_pham`: `select('*')` và `.select()`
 * trống sau insert/update đều lỗi 42501 cho MỌI vai trò. Mọi truy vấn dưới đây liệt
 * kê cột tường minh, và giá vốn chỉ về qua RPC.
 */

export async function layDanhSachSanPham(
  b: BoLocSanPham,
): Promise<TrangDuLieu<DongSanPham>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_san_pham",
    thamSoRpc(b),
  );
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}

export async function layChiTietSanPham(id: string): Promise<ChiTietSanPham | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_san_pham", {
    p_id: id,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function layTheKho(
  sanPhamId: string,
  khoId: string | null,
  trang: number,
): Promise<TrangDuLieu<DongTheKho>> {
  const { data, error } = await getSupabaseBrowserClient().rpc("the_kho_san_pham", {
    p_san_pham_id: sanPhamId,
    p_kho_id: khoId ?? undefined,
    p_trang: trang,
    p_kich_thuoc: 50,
  });
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}

export async function layTonTheoKho(sanPhamId: string): Promise<TonTheoKho[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("ton_kho")
    .select("kho_id, so_luong, kho:kho_id(ten)")
    .eq("san_pham_id", sanPhamId);
  if (error) throw error;

  return (data ?? []).map((d) => ({
    kho_id: d.kho_id,
    ten_kho: d.kho?.ten ?? "(không rõ kho)",
    so_luong: Number(d.so_luong),
  }));
}

export async function layDanhMucPhu(): Promise<DanhMucPhu> {
  const sb = getSupabaseBrowserClient();

  const [nhom, dvt, congDoan, kho] = await Promise.all([
    sb.from("nhom_hang").select("id, ma, ten").order("ten"),
    sb.from("don_vi_tinh").select("id, ma, ten").order("ten"),
    sb.from("cong_doan").select("id, ma, ten, mau_hien_thi").order("ten"),
    sb.from("kho").select("id, ma, ten").eq("dang_hoat_dong", true).order("ma"),
  ]);

  for (const kq of [nhom, dvt, congDoan, kho]) {
    if (kq.error) throw kq.error;
  }

  return {
    nhomHang: (nhom.data ?? []) as MucDanhMucPhu[],
    donViTinh: (dvt.data ?? []) as MucDanhMucPhu[],
    congDoan: (congDoan.data ?? []) as MucCongDoan[],
    kho: (kho.data ?? []) as MucDanhMucPhu[],
  };
}

/** Văn phòng không được đụng giá bán (trigger 0015) — bỏ hẳn khóa khỏi payload. */
function boGiaBanNeuKhongDuQuyen(giaTri: SanPhamInput, guiGiaBan: boolean): SanPhamInput {
  if (guiGiaBan) return giaTri;

  const conLai = { ...giaTri };
  delete conLai.gia_ban;
  return conLai;
}

export async function taoSanPham(
  giaTri: SanPhamInput,
  guiGiaBan: boolean,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("san_pham")
    .insert(boGiaBanNeuKhongDuQuyen(giaTri, guiGiaBan))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function capNhatSanPham(
  id: string,
  giaTri: SanPhamInput,
  guiGiaBan: boolean,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("san_pham")
    .update(boGiaBanNeuKhongDuQuyen(giaTri, guiGiaBan))
    .eq("id", id);
  if (error) throw error;
}

export type ThayDoiHangLoat = {
  nhom_hang_id?: string | null;
  dvt_id?: string;
  cong_doan_id?: string;
  dang_kinh_doanh?: boolean;
};

export async function ganHangLoat(
  ids: string[],
  thayDoi: ThayDoiHangLoat,
  nguon: "hang_loat" | "sua_o",
): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc("gan_hang_loat", {
    p_ids: ids,
    p_thay_doi: thayDoi as Json,
    p_nguon: nguon,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function layGoiYCongDoan(): Promise<GoiYCongDoan[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "goi_y_cong_doan_theo_duoi",
  );
  if (error) throw error;
  return data ?? [];
}

export async function apDungGoiYCongDoan(ids: string[]): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "ap_dung_goi_y_cong_doan",
    { p_ids: ids },
  );
  if (error) throw error;
  return data ?? 0;
}

export async function xacNhanDaRa(ids: string[]): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc("xac_nhan_da_ra", {
    p_ids: ids,
  });
  if (error) throw error;
  return data ?? 0;
}
