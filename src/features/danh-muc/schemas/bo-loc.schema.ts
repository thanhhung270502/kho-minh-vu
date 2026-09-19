import { z } from "zod";

import type { Database } from "@/types/database.types";

export const TRANG_THAI_TON = ["con_hang", "het_hang", "am", "duoi_dinh_muc"] as const;
export const COT_SAP_XEP = ["ma_hang", "ten_hang", "tong_ton", "updated_at"] as const;

export type TrangThaiTon = (typeof TRANG_THAI_TON)[number];
export type CotSapXep = (typeof COT_SAP_XEP)[number];

export type BoLocSanPham = {
  q: string;
  nhomHangId: string | null;
  congDoanId: string | null;
  dvtId: string | null;
  trangThaiTon: TrangThaiTon | null;
  kinhDoanh: "dang" | "ngung" | "tat_ca";
  canRa: boolean;
  sapXep: CotSapXep | null;
  huong: "asc" | "desc";
  trang: number;
  kichThuoc: number;
};

export const BO_LOC_MAC_DINH: BoLocSanPham = {
  q: "",
  nhomHangId: null,
  congDoanId: null,
  dvtId: null,
  trangThaiTon: null,
  kinhDoanh: "dang",
  canRa: false,
  sapXep: null,
  huong: "asc",
  trang: 1,
  kichThuoc: 50,
};

export const KICH_THUOC_TRANG = [20, 50, 100, 200] as const;

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm kiếm (ô tìm nằm ngoài panel). */
export function demDieuKien(b: BoLocSanPham): number {
  let dem = 0;
  if (b.nhomHangId !== null) dem++;
  if (b.congDoanId !== null) dem++;
  if (b.dvtId !== null) dem++;
  if (b.trangThaiTon !== null) dem++;
  if (b.canRa) dem++;
  if (b.kinhDoanh !== BO_LOC_MAC_DINH.kinhDoanh) dem++;
  return dem;
}

const uuid = z.string().uuid();

function docUuid(v: string | null): string | null {
  return v && uuid.safeParse(v).success ? v : null;
}

/** URL là nguồn sự thật của bộ lọc: refresh hay gửi link đều giữ nguyên (D-11). */
export function docBoLocTuUrl(
  sp: URLSearchParams | { get(k: string): string | null },
): BoLocSanPham {
  const so = (k: string, mac: number, min: number, max: number) => {
    // `Number(null)` là 0 chứ không phải NaN — thiếu bước này thì khóa vắng mặt
    // bị kẹp về `min` thay vì lấy giá trị mặc định.
    const tho = sp.get(k);
    if (tho === null || tho.trim() === "") return mac;

    const n = Number(tho);
    if (!Number.isFinite(n)) return mac;

    return Math.min(Math.max(Math.trunc(n), min), max);
  };

  const ton = sp.get("ton");
  const sapXep = sp.get("sap_xep");
  const kinhDoanh = sp.get("kinh_doanh");
  const huong = sp.get("huong");

  return {
    q: sp.get("q")?.trim() ?? "",
    nhomHangId: docUuid(sp.get("nhom")),
    congDoanId: docUuid(sp.get("cong_doan")),
    dvtId: docUuid(sp.get("dvt")),
    trangThaiTon: TRANG_THAI_TON.includes(ton as TrangThaiTon) ? (ton as TrangThaiTon) : null,
    kinhDoanh:
      kinhDoanh === "ngung" || kinhDoanh === "tat_ca" ? kinhDoanh : BO_LOC_MAC_DINH.kinhDoanh,
    canRa: sp.get("can_ra") === "1",
    sapXep: COT_SAP_XEP.includes(sapXep as CotSapXep) ? (sapXep as CotSapXep) : null,
    huong: huong === "desc" ? "desc" : "asc",
    trang: so("trang", 1, 1, 100_000),
    kichThuoc: so("kich_thuoc", BO_LOC_MAC_DINH.kichThuoc, 10, 200),
  };
}

/** Chỉ ghi khóa khác mặc định để URL gọn và dễ đọc. */
export function ghiBoLocRaUrl(b: BoLocSanPham): URLSearchParams {
  const sp = new URLSearchParams();
  if (b.q) sp.set("q", b.q);
  if (b.nhomHangId) sp.set("nhom", b.nhomHangId);
  if (b.congDoanId) sp.set("cong_doan", b.congDoanId);
  if (b.dvtId) sp.set("dvt", b.dvtId);
  if (b.trangThaiTon) sp.set("ton", b.trangThaiTon);
  if (b.kinhDoanh !== BO_LOC_MAC_DINH.kinhDoanh) sp.set("kinh_doanh", b.kinhDoanh);
  if (b.canRa) sp.set("can_ra", "1");
  if (b.sapXep) sp.set("sap_xep", b.sapXep);
  if (b.huong !== BO_LOC_MAC_DINH.huong) sp.set("huong", b.huong);
  if (b.trang !== BO_LOC_MAC_DINH.trang) sp.set("trang", String(b.trang));
  if (b.kichThuoc !== BO_LOC_MAC_DINH.kichThuoc) sp.set("kich_thuoc", String(b.kichThuoc));
  return sp;
}

type ArgsDanhSach = Database["public"]["Functions"]["danh_sach_san_pham"]["Args"];

export function thamSoRpc(b: BoLocSanPham): ArgsDanhSach {
  const args: ArgsDanhSach = {
    p_tu_khoa: b.q || undefined,
    p_nhom_hang_id: b.nhomHangId ?? undefined,
    p_cong_doan_id: b.congDoanId ?? undefined,
    p_dvt_id: b.dvtId ?? undefined,
    p_trang_thai_ton: b.trangThaiTon ?? undefined,
    p_dang_kinh_doanh: b.kinhDoanh === "dang",
    p_can_ra: b.canRa ? true : undefined,
    p_sap_xep: b.sapXep ?? undefined,
    p_huong: b.huong,
    p_trang: b.trang,
    p_kich_thuoc: b.kichThuoc,
  };

  if (b.kinhDoanh === "tat_ca") {
    // "Tất cả" phải gửi null TƯỜNG MINH. Bỏ trường đi thì RPC dùng mặc định
    // `p_dang_kinh_doanh = true` và màn hình lặng lẽ giấu mã đã ngừng kinh doanh.
    (args as Record<string, unknown>).p_dang_kinh_doanh = null;
  }

  return args;
}
