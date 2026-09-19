import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/types/database.types";

import type { Page } from "@/features/products/types";
import type { DongDoiTac } from "../types";

export type DongGhiChu =
  Database["public"]["Functions"]["danh_sach_ghi_chu_kiotviet"]["Returns"][number];

export type LoaiQuyet = "KHACH" | "SALE" | "KHACH_VA_SALE" | "BO_QUA";

export type BoLocGhiChu = {
  trangThai: "chua_ra" | "da_ra";
  q: string;
  page: number;
};

export const BO_LOC_GHI_CHU_MAC_DINH: BoLocGhiChu = {
  trangThai: "chua_ra",
  q: "",
  page: 1,
};

const KICH_THUOC = 30;

export const khoaRaGhiChu = {
  tatCa: ["ra-ghi-chu"] as const,
  danhSach: (b: BoLocGhiChu) => ["ra-ghi-chu", "ds", b] as const,
  dem: ["ra-ghi-chu", "dem"] as const,
  timKhach: (q: string) => ["ra-ghi-chu", "tim-khach", q] as const,
};

export async function layGhiChu(b: BoLocGhiChu): Promise<Page<DongGhiChu>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_ghi_chu_kiotviet",
    {
      p_trang_thai: b.trangThai,
      p_tu_khoa: b.q || undefined,
      p_trang: b.page,
      p_kich_thuoc: KICH_THUOC,
    },
  );
  if (error) throw error;

  const dong = data ?? [];
  return { dong, tong: Number(dong[0]?.tong_so_dong ?? 0) };
}

/** Thanh tiến độ cần cả hai con số; hỏi song song cho nhanh. */
export async function demGhiChu(): Promise<{ chuaRa: number; tong: number }> {
  const sb = getSupabaseBrowserClient();

  const [con, tatCa] = await Promise.all([
    sb.rpc("danh_sach_ghi_chu_kiotviet", {
      p_trang_thai: "chua_ra",
      p_trang: 1,
      p_kich_thuoc: 1,
    }),
    sb.rpc("danh_sach_ghi_chu_kiotviet", { p_trang: 1, p_kich_thuoc: 1 }),
  ]);

  if (con.error) throw con.error;
  if (tatCa.error) throw tatCa.error;

  return {
    chuaRa: Number(con.data?.[0]?.tong_so_dong ?? 0),
    tong: Number(tatCa.data?.[0]?.tong_so_dong ?? 0),
  };
}

export type QuyetDinh = {
  giaTri: string;
  loai: LoaiQuyet;
  doiTacId?: string;
  taoKhach?: { ma?: string; ten: string; dien_thoai?: string | null };
  tenSale?: string;
};

export async function quyetGhiChu(q: QuyetDinh): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("quyet_ghi_chu", {
    p_gia_tri: q.giaTri,
    p_loai: q.loai,
    p_doi_tac_id: q.doiTacId,
    p_tao_khach: q.taoKhach ? (q.taoKhach as unknown as Json) : undefined,
    p_ten_sale: q.tenSale,
  });
  if (error) throw error;
}

export async function boQuyetGhiChu(giaTri: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("bo_quyet_ghi_chu", {
    p_gia_tri: giaTri,
  });
  if (error) throw error;
}

/** Ô "Gộp vào khách" — tìm trong khách hàng đang hoạt động. */
export async function timKhach(q: string): Promise<DongDoiTac[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_doi_tac", {
    p_tu_khoa: q || undefined,
    p_loai: "KHACH",
    p_dang_hoat_dong: true,
    p_trang: 1,
    p_kich_thuoc: 20,
  });
  if (error) throw error;
  return data ?? [];
}
