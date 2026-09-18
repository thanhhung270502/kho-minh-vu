import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TrangDuLieu } from "@/features/danh-muc/types";

import type { DoiTacLuu } from "../schemas/doi-tac.schema";
import {
  BO_LOC_DOI_TAC_MAC_DINH,
  type BoLocDoiTac,
  type ChiTietDoiTac,
  type DongDoiTac,
  type DongLichSuGiaoDich,
  type LoaiDoiTac,
} from "../types";

const COT_CHI_TIET =
  "id, ma, ten, loai, dien_thoai, email, dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong, created_at, updated_at";

const LOAI_HOP_LE: LoaiDoiTac[] = ["NCC", "KHACH", "CA_HAI"];

export function docBoLocDoiTac(sp: {
  get(k: string): string | null;
}): BoLocDoiTac {
  const loai = sp.get("loai");
  const hoatDong = sp.get("hoat_dong");
  const trang = Number(sp.get("trang"));

  return {
    q: sp.get("q")?.trim() ?? "",
    loai: LOAI_HOP_LE.includes(loai as LoaiDoiTac) ? (loai as LoaiDoiTac) : null,
    hoatDong:
      hoatDong === "ngung" || hoatDong === "tat_ca"
        ? hoatDong
        : BO_LOC_DOI_TAC_MAC_DINH.hoatDong,
    trang: Number.isFinite(trang) && trang >= 1 ? Math.trunc(trang) : 1,
  };
}

export function ghiBoLocDoiTac(b: BoLocDoiTac): URLSearchParams {
  const sp = new URLSearchParams();
  if (b.q) sp.set("q", b.q);
  if (b.loai) sp.set("loai", b.loai);
  if (b.hoatDong !== BO_LOC_DOI_TAC_MAC_DINH.hoatDong) sp.set("hoat_dong", b.hoatDong);
  if (b.trang !== 1) sp.set("trang", String(b.trang));
  return sp;
}

export async function layDanhSachDoiTac(
  b: BoLocDoiTac,
): Promise<TrangDuLieu<DongDoiTac>> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_doi_tac", {
    p_tu_khoa: b.q || undefined,
    p_loai: b.loai ?? undefined,
    // "tất cả" phải gửi null tường minh, bỏ trống thì RPC mặc định chỉ lấy đang hoạt động.
    ...(b.hoatDong === "tat_ca"
      ? { p_dang_hoat_dong: null as unknown as boolean }
      : { p_dang_hoat_dong: b.hoatDong === "dang" }),
    p_trang: b.trang,
    p_kich_thuoc: 50,
  });
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}

export async function layChiTietDoiTac(id: string): Promise<ChiTietDoiTac | null> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("doi_tac")
    .select(COT_CHI_TIET)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function goiYMaDoiTac(loai: LoaiDoiTac): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("sinh_ma_doi_tac", {
    p_loai: loai,
  });
  if (error) throw error;
  return data ?? "";
}

export async function luuDoiTac(id: string | null, v: DoiTacLuu): Promise<string> {
  const sb = getSupabaseBrowserClient();

  if (id) {
    const { error } = await sb.from("doi_tac").update(v).eq("id", id);
    if (error) throw error;
    return id;
  }

  const { data, error } = await sb.from("doi_tac").insert(v).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function layLichSuGiaoDich(
  doiTacId: string,
  trang: number,
): Promise<TrangDuLieu<DongLichSuGiaoDich>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "lich_su_giao_dich_doi_tac",
    { p_doi_tac_id: doiTacId, p_trang: trang, p_kich_thuoc: 50 },
  );
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}
