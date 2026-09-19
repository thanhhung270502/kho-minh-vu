import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TrangDuLieu } from "@/features/danh-muc/types";

import {
  thamSoRpcPhieu,
  type BoLocPhieu,
  type DauPhieuInput,
  type DongPhieuInput,
} from "../schemas/phieu-nhap.schema";
import type { ChiTietPhieu, DongDanhSachPhieu, DongPhieu, NguonNhap } from "../types";

export async function layDanhSachPhieu(
  b: BoLocPhieu,
): Promise<TrangDuLieu<DongDanhSachPhieu>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_chung_tu",
    thamSoRpcPhieu(b),
  );
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}

export async function layChiTietPhieu(id: string): Promise<ChiTietPhieu | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_chung_tu", {
    p_id: id,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function layDongPhieu(id: string): Promise<DongPhieu[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("dong_chung_tu", {
    p_id: id,
  });
  if (error) throw error;
  return data ?? [];
}

export type DauPhieuMoi = {
  doi_tac_id: string;
  kho_id: string;
  nguon_nhap: NguonNhap;
  ngay_ct?: string;
};

/**
 * D-09: tạo phiếu là sinh NGAY chứng từ có số trên server. Số phiếu lấy từ
 * `sinh_so_ct` — không tự ghép ở client, hai người tạo cùng lúc sẽ trùng số.
 */
export async function taoPhieuNhap(v: DauPhieuMoi): Promise<string> {
  const sb = getSupabaseBrowserClient();

  const { data: soCt, error: loiSo } = await sb.rpc("sinh_so_ct", {
    p_loai: "NHAP",
    p_nguon: v.nguon_nhap === "NHA_MAY" ? "NHA_MAY" : "",
  });
  if (loiSo) throw loiSo;

  const { data, error } = await sb
    .from("chung_tu")
    .insert({
      so_ct: soCt,
      loai_ct: "NHAP",
      kho_id: v.kho_id,
      doi_tac_id: v.doi_tac_id,
      nguon_nhap: v.nguon_nhap,
      ...(v.ngay_ct ? { ngay_ct: v.ngay_ct } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

/** Sửa đầu phiếu: chỉ chạy được khi phiếu còn NHAP_LIEU (policy 0016). */
export async function capNhatDauPhieu(
  id: string,
  v: Partial<DauPhieuInput>,
): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu")
    .update(v, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không lưu được — phiếu đã ghi sổ hoặc tài khoản không có quyền sửa.",
    );
  }
}

export async function themDong(
  chungTuId: string,
  d: DongPhieuInput,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .insert({
      chung_tu_id: chungTuId,
      san_pham_id: d.san_pham_id,
      so_luong: d.so_luong,
      don_gia: d.don_gia,
      thanh_tien: Math.round(d.so_luong * d.don_gia),
      kho_id: d.kho_id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function capNhatDong(
  id: string,
  d: Partial<DongPhieuInput>,
): Promise<void> {
  const giaTri: Partial<DongPhieuInput> & { thanh_tien?: number } = { ...d };
  if (d.so_luong !== undefined && d.don_gia !== undefined) {
    giaTri.thanh_tien = Math.round(d.so_luong * d.don_gia);
  }

  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .update(giaTri, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("Không sửa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
}

export async function xoaDong(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("Không xóa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
}

export async function ghiSo(id: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("ghi_so_chung_tu", {
    p_chung_tu_id: id,
  });
  if (error) throw error;
}

export async function huyPhieu(id: string, lyDo: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("huy_chung_tu", {
    p_chung_tu_id: id,
    p_ly_do: lyDo,
  });
  if (error) throw error;
}
