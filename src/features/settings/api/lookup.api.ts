import type { PostgrestError } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LookupTableName = "kho" | "nhom_hang" | "don_vi_tinh" | "cong_doan";

/**
 * Một dòng của bất kỳ bảng danh mục phụ nào. Các cột chỉ có ở một bảng để
 * optional — bảng nào hiện cột nào do `LOOKUP_TABLE_CONFIG` quyết định.
 */
export type LookupRow = {
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

export type LookupTableConfig = {
  label: string;
  title: string;
  cot: string;
  /** Kho KHÔNG xóa được: tồn kho và chứng từ cũ trỏ vào — ngừng hoạt động thay vì xóa. */
  deletable: boolean;
  hasParent: boolean;
  hasColor: boolean;
  hasAddress: boolean;
  hasStatus: boolean;
};

export const LOOKUP_TABLE_CONFIG: Record<LookupTableName, LookupTableConfig> = {
  kho: {
    label: "kho",
    title: "Kho",
    cot: "id, ma, ten, dia_chi, dang_hoat_dong, updated_at",
    deletable: false,
    hasParent: false,
    hasColor: false,
    hasAddress: true,
    hasStatus: true,
  },
  nhom_hang: {
    label: "nhóm hàng",
    title: "Nhóm hàng",
    cot: "id, ma, ten, parent_id, thu_tu, updated_at",
    deletable: true,
    hasParent: true,
    hasColor: false,
    hasAddress: false,
    hasStatus: false,
  },
  don_vi_tinh: {
    label: "đơn vị tính",
    title: "Đơn vị tính",
    cot: "id, ma, ten, updated_at",
    deletable: true,
    hasParent: false,
    hasColor: false,
    hasAddress: false,
    hasStatus: false,
  },
  cong_doan: {
    label: "công đoạn",
    title: "Công đoạn",
    cot: "id, ma, ten, mau_hien_thi, updated_at",
    deletable: true,
    hasParent: false,
    hasColor: true,
    hasAddress: false,
    hasStatus: false,
  },
};

/**
 * Mã được CODE dùng như hằng số (gợi ý công đoạn theo đuôi mã, `la_can_ra`,
 * `cong_doan_khi_tao_moi` khi nhập Excel). Trùng đúng danh sách trong migration
 * 0040 — database mới là nơi chặn thật, đây chỉ để ẩn nút cho đỡ bực.
 */
export const SYSTEM_CODES: Record<LookupTableName, readonly string[]> = {
  kho: [],
  nhom_hang: [],
  don_vi_tinh: ["CAI"],
  cong_doan: ["EP", "SON", "CARBON", "XI_MA", "NANO", "MUA_NGOAI"],
};

export function isSystemCode(table: LookupTableName, ma: string): boolean {
  return SYSTEM_CODES[table].includes(ma);
}

export type LookupValues = {
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
 * kê tường minh trong `LOOKUP_TABLE_CONFIG.cot`, kết quả thu về
 * `LookupRow` — không có `any` nào lọt ra ngoài file này.
 */
type QueryResult = PromiseLike<{
  data: unknown;
  error: PostgrestError | null;
  count: number | null;
}>;

type TableSlice = {
  select(cot: string): { order(cot: string): QueryResult };
  insert(v: LookupValues): QueryResult;
  update(v: LookupValues): { eq(cot: string, gt: string): QueryResult };
  delete(tuyChon: { count: "exact" }): { eq(cot: string, gt: string): QueryResult };
};

function table(ten: LookupTableName): TableSlice {
  const sb = getSupabaseBrowserClient() as unknown as {
    from(t: string): TableSlice;
  };
  return sb.from(ten);
}

export async function fetchLookupRows(ten: LookupTableName): Promise<LookupRow[]> {
  const { data, error } = await table(ten)
    .select(LOOKUP_TABLE_CONFIG[ten].cot)
    .order("ma");
  if (error) throw error;
  return (data ?? []) as unknown as LookupRow[];
}

export async function createLookupRow(
  ten: LookupTableName,
  v: LookupValues,
): Promise<void> {
  const { error } = await table(ten).insert(v);
  if (error) throw error;
}

export async function updateLookupRow(
  ten: LookupTableName,
  id: string,
  v: LookupValues,
): Promise<void> {
  const { error } = await table(ten).update(v).eq("id", id);
  if (error) throw error;
}

/**
 * Không có policy DELETE thì Postgres lọc sạch dòng và trả về 0 — `error` là
 * null, giao diện sẽ báo "đã xóa" trong khi dữ liệu còn nguyên. Đếm để phát hiện.
 */
export async function deleteLookupRow(ten: LookupTableName, id: string): Promise<void> {
  const { error, count } = await table(ten).delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không xóa được — tài khoản không có quyền xóa mục này. Nhờ quản lý xóa giúp.",
    );
  }
}

export type DocType = Database["public"]["Enums"]["loai_ct"];
