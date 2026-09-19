import type { PostgrestError } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type BangDanhMucPhu = "kho" | "nhom_hang" | "don_vi_tinh" | "cong_doan";

/**
 * Một dòng của bất kỳ bảng danh mục phụ nào. Các cột chỉ có ở một bảng để
 * optional — bảng nào hiện cột nào do `CAU_HINH_DANH_MUC_PHU` quyết định.
 */
export type LookupItem = {
  id: string;
  ma: string;
  ten: string;
  updated_at: string;
  parent_id?: string | null;
  thu_tu?: number;
  mau_hien_thi?: string | null;
  dia_chi?: string | null;
  dang_hoat_dong?: boolean;
};

export type CauHinhDanhMucPhu = {
  label: string;
  nhanHoa: string;
  cot: string;
  /** Kho KHÔNG xóa được: tồn kho và chứng từ cũ trỏ vào — ngừng hoạt động thay vì xóa. */
  xoaDuoc: boolean;
  coCha: boolean;
  coMau: boolean;
  coDiaChi: boolean;
  coTrangThai: boolean;
};

export const CAU_HINH_DANH_MUC_PHU: Record<BangDanhMucPhu, CauHinhDanhMucPhu> = {
  kho: {
    label: "kho",
    nhanHoa: "Kho",
    cot: "id, ma, ten, dia_chi, dang_hoat_dong, updated_at",
    xoaDuoc: false,
    coCha: false,
    coMau: false,
    coDiaChi: true,
    coTrangThai: true,
  },
  nhom_hang: {
    label: "nhóm hàng",
    nhanHoa: "Nhóm hàng",
    cot: "id, ma, ten, parent_id, thu_tu, updated_at",
    xoaDuoc: true,
    coCha: true,
    coMau: false,
    coDiaChi: false,
    coTrangThai: false,
  },
  don_vi_tinh: {
    label: "đơn vị tính",
    nhanHoa: "Đơn vị tính",
    cot: "id, ma, ten, updated_at",
    xoaDuoc: true,
    coCha: false,
    coMau: false,
    coDiaChi: false,
    coTrangThai: false,
  },
  cong_doan: {
    label: "công đoạn",
    nhanHoa: "Công đoạn",
    cot: "id, ma, ten, mau_hien_thi, updated_at",
    xoaDuoc: true,
    coCha: false,
    coMau: true,
    coDiaChi: false,
    coTrangThai: false,
  },
};

/**
 * Mã được CODE dùng như hằng số (gợi ý công đoạn theo đuôi mã, `la_can_ra`,
 * `cong_doan_khi_tao_moi` khi nhập Excel). Trùng đúng danh sách trong migration
 * 0040 — database mới là nơi chặn thật, đây chỉ để ẩn nút cho đỡ bực.
 */
export const MA_HE_THONG: Record<BangDanhMucPhu, readonly string[]> = {
  kho: [],
  nhom_hang: [],
  don_vi_tinh: ["CAI"],
  cong_doan: ["EP", "SON", "CARBON", "XI_MA", "NANO", "MUA_NGOAI"],
};

export function laMaHeThong(table: BangDanhMucPhu, ma: string): boolean {
  return MA_HE_THONG[table].includes(ma);
}

export type GiaTriDanhMucPhu = {
  ma: string;
  ten: string;
  parent_id?: string | null;
  mau_hien_thi?: string | null;
  dia_chi?: string | null;
  dang_hoat_dong?: boolean;
};

/**
 * Bốn bảng có shape khác nhau nên supabase-js không suy được kiểu chung cho
 * `.from(table)` — nó chốt vào bảng đầu của union và báo lỗi cột. Khai một mặt
 * cắt hẹp đúng bốn thao tác đang dùng, ép kiểu CHỈ ở đây. Cột đọc ra luôn liệt
 * kê tường minh trong `CAU_HINH_DANH_MUC_PHU.cot`, kết quả thu về
 * `LookupItem` — không có `any` nào lọt ra ngoài file này.
 */
type KetQua = PromiseLike<{
  data: unknown;
  error: PostgrestError | null;
  count: number | null;
}>;

type MatCatBang = {
  select(cot: string): { order(cot: string): KetQua };
  insert(v: GiaTriDanhMucPhu): KetQua;
  update(v: GiaTriDanhMucPhu): { eq(cot: string, gt: string): KetQua };
  delete(tuyChon: { count: "exact" }): { eq(cot: string, gt: string): KetQua };
};

function table(ten: BangDanhMucPhu): MatCatBang {
  const sb = getSupabaseBrowserClient() as unknown as {
    from(t: string): MatCatBang;
  };
  return sb.from(ten);
}

export async function fetchLookups(ten: BangDanhMucPhu): Promise<LookupItem[]> {
  const { data, error } = await table(ten)
    .select(CAU_HINH_DANH_MUC_PHU[ten].cot)
    .order("ma");
  if (error) throw error;
  return (data ?? []) as unknown as LookupItem[];
}

export async function taoMucDanhMucPhu(
  ten: BangDanhMucPhu,
  v: GiaTriDanhMucPhu,
): Promise<void> {
  const { error } = await table(ten).insert(v);
  if (error) throw error;
}

export async function capNhatMucDanhMucPhu(
  ten: BangDanhMucPhu,
  id: string,
  v: GiaTriDanhMucPhu,
): Promise<void> {
  const { error } = await table(ten).update(v).eq("id", id);
  if (error) throw error;
}

/**
 * Không có policy DELETE thì Postgres lọc sạch dòng và trả về 0 — `error` là
 * null, giao diện sẽ báo "đã xóa" trong khi dữ liệu còn nguyên. Đếm để phát hiện.
 */
export async function xoaMucDanhMucPhu(ten: BangDanhMucPhu, id: string): Promise<void> {
  const { error, count } = await table(ten).delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không xóa được — tài khoản không có quyền xóa mục này. Nhờ quản lý xóa giúp.",
    );
  }
}

export type LoaiCt = Database["public"]["Enums"]["loai_ct"];
