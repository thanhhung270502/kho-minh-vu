import { z } from "zod";

import type { Database } from "@/types/database.types";
import type { NguonNhap, TrangThaiCt } from "../types";

/** KHÔNG dùng z.coerce.number(): InputNumber của antd đã trả number|null (bẫy 11). */
export const dauPhieuSchema = z.object({
  doi_tac_id: z.string().uuid("Chọn nhà cung cấp"),
  kho_id: z.string().uuid("Chọn kho"),
  ngay_ct: z.string().min(1, "Chọn ngày"),
  nguon_nhap: z.enum(["NCC", "NHA_MAY"]),
  ghi_chu: z
    .string()
    .trim()
    .nullable()
    .transform((v) => v || null),
});

export const dongPhieuSchema = z.object({
  san_pham_id: z.string().uuid("Chọn mã hàng"),
  so_luong: z.number({ message: "Số lượng phải là số" }).gt(0, "Số lượng phải lớn hơn 0"),
  don_gia: z.number({ message: "Đơn gia phải là số" }).min(0, "Đơn giá không được âm"),
  kho_id: z.string().uuid().nullable(),
});

export type DauPhieuInput = z.input<typeof dauPhieuSchema>;
export type DongPhieuInput = z.infer<typeof dongPhieuSchema>;

// --- Bộ lọc trên URL --------------------------------------------------------

export type BoLocPhieu = {
  q: string;
  trangThai: TrangThaiCt | null;
  doiTacId: string | null;
  khoId: string | null;
  nguonNhap: NguonNhap | null;
  tuNgay: string | null;
  denNgay: string | null;
  trang: number;
};

export const BO_LOC_PHIEU_MAC_DINH: BoLocPhieu = {
  q: "",
  trangThai: null,
  doiTacId: null,
  khoId: null,
  nguonNhap: null,
  tuNgay: null,
  denNgay: null,
  trang: 1,
};

export const KICH_THUOC_PHIEU = 50;

const TRANG_THAI: TrangThaiCt[] = ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"];
const NGUON: NguonNhap[] = ["NCC", "NHA_MAY"];

const uuid = z.string().uuid();
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

function docUuid(v: string | null): string | null {
  return v && uuid.safeParse(v).success ? v : null;
}

function docNgay(v: string | null): string | null {
  return v && NGAY.test(v) ? v : null;
}

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm (ô tìm nằm ngoài panel). */
export function demDieuKienPhieu(b: BoLocPhieu): number {
  let dem = 0;
  if (b.trangThai !== null) dem++;
  if (b.doiTacId !== null) dem++;
  if (b.khoId !== null) dem++;
  if (b.nguonNhap !== null) dem++;
  if (b.tuNgay !== null || b.denNgay !== null) dem++;
  return dem;
}

export function docBoLocPhieu(sp: { get(k: string): string | null }): BoLocPhieu {
  const tt = sp.get("trang_thai");
  const ng = sp.get("nguon");
  // `Number(null)` là 0 chứ không phải NaN — phải chặn trước khi Number().
  const tho = sp.get("trang");
  const trang = tho === null || tho.trim() === "" ? 1 : Number(tho);

  return {
    q: sp.get("q")?.trim() ?? "",
    trangThai: TRANG_THAI.includes(tt as TrangThaiCt) ? (tt as TrangThaiCt) : null,
    doiTacId: docUuid(sp.get("ncc")),
    khoId: docUuid(sp.get("kho")),
    nguonNhap: NGUON.includes(ng as NguonNhap) ? (ng as NguonNhap) : null,
    tuNgay: docNgay(sp.get("tu_ngay")),
    denNgay: docNgay(sp.get("den_ngay")),
    trang: Number.isFinite(trang) && trang >= 1 ? Math.trunc(trang) : 1,
  };
}

export function ghiBoLocPhieu(b: BoLocPhieu): URLSearchParams {
  const sp = new URLSearchParams();
  if (b.q) sp.set("q", b.q);
  if (b.trangThai) sp.set("trang_thai", b.trangThai);
  if (b.doiTacId) sp.set("ncc", b.doiTacId);
  if (b.khoId) sp.set("kho", b.khoId);
  if (b.nguonNhap) sp.set("nguon", b.nguonNhap);
  if (b.tuNgay) sp.set("tu_ngay", b.tuNgay);
  if (b.denNgay) sp.set("den_ngay", b.denNgay);
  if (b.trang !== 1) sp.set("trang", String(b.trang));
  return sp;
}

type ArgsDanhSach = Database["public"]["Functions"]["danh_sach_chung_tu"]["Args"];

export function thamSoRpcPhieu(b: BoLocPhieu): ArgsDanhSach {
  return {
    p_loai_ct: "NHAP",
    p_trang_thai: b.trangThai ?? undefined,
    p_doi_tac_id: b.doiTacId ?? undefined,
    p_kho_id: b.khoId ?? undefined,
    p_nguon_nhap: b.nguonNhap ?? undefined,
    p_tu_ngay: b.tuNgay ?? undefined,
    p_den_ngay: b.denNgay ?? undefined,
    p_tu_khoa: b.q || undefined,
    p_trang: b.trang,
    p_kich_thuoc: KICH_THUOC_PHIEU,
  };
}
