import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

import { toListRpcArgs, type ProductFilter } from "../schemas/filter.schema";
import {
  PRODUCT_FIELD_TO_COLUMN,
  toProductDetail,
  toProductRow,
  toStageSuggestion,
  toStockCardRow,
  type EditableProductField,
  type Lookups,
  type Page,
  type ProductDetail,
  toProductInsert,
  type ProductInput,
  type ProductInsert,
  type ProductRow,
  type StageSuggestion,
  type StockCardRow,
  type WarehouseStock,
} from "../types";

/**
 * Migration 0029 thu quyền đọc mức bảng của `san_pham`: `select('*')` và `.select()`
 * trống sau insert/update đều lỗi 42501 cho MỌI vai trò. Mọi truy vấn dưới đây liệt
 * kê cột tường minh, và giá vốn chỉ về qua RPC.
 */

export async function fetchProducts(
  filter: ProductFilter,
): Promise<Page<ProductRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_san_pham",
    toListRpcArgs(filter),
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toProductRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_san_pham", {
    p_id: id,
  });
  if (error) throw error;

  const row = data?.[0];
  return row ? toProductDetail(row) : null;
}

export async function fetchStockCard(
  productId: string,
  warehouseId: string | null,
  page: number,
): Promise<Page<StockCardRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc("the_kho_san_pham", {
    p_san_pham_id: productId,
    p_kho_id: warehouseId ?? undefined,
    p_trang: page,
    p_kich_thuoc: 50,
  });
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toStockCardRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchStockByWarehouse(
  productId: string,
): Promise<WarehouseStock[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("ton_kho")
    .select("kho_id, so_luong, kho:kho_id(ten)")
    .eq("san_pham_id", productId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    warehouseId: row.kho_id,
    warehouseName: row.kho?.ten ?? "(không rõ kho)",
    quantity: Number(row.so_luong),
  }));
}

export async function fetchLookups(): Promise<Lookups> {
  const supabase = getSupabaseBrowserClient();

  const [categories, units, stages, warehouses] = await Promise.all([
    supabase.from("nhom_hang").select("id, ma, ten").order("ten"),
    supabase.from("don_vi_tinh").select("id, ma, ten").order("ten"),
    supabase.from("cong_doan").select("id, ma, ten, mau_hien_thi").order("ten"),
    supabase
      .from("kho")
      .select("id, ma, ten")
      .eq("dang_hoat_dong", true)
      .order("ma"),
  ]);

  for (const result of [categories, units, stages, warehouses]) {
    if (result.error) throw result.error;
  }

  const toItem = (row: { id: string; ma: string; ten: string }) => ({
    id: row.id,
    code: row.ma,
    name: row.ten,
  });

  return {
    categories: (categories.data ?? []).map(toItem),
    units: (units.data ?? []).map(toItem),
    stages: (stages.data ?? []).map((row) => ({
      ...toItem(row),
      color: row.mau_hien_thi,
    })),
    warehouses: (warehouses.data ?? []).map(toItem),
  };
}

/** Văn phòng không được đụng giá bán (trigger 0015) — bỏ hẳn khóa khỏi payload. */
function toWritePayload(
  values: ProductInput,
  includeSalePrice: boolean,
): ProductInsert {
  const payload = toProductInsert(values);
  if (includeSalePrice) return payload;

  delete payload.gia_ban;
  return payload;
}

export async function createProduct(
  values: ProductInput,
  includeSalePrice: boolean,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("san_pham")
    .insert(toWritePayload(values, includeSalePrice))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProduct(
  id: string,
  values: ProductInput,
  includeSalePrice: boolean,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("san_pham")
    .update(toWritePayload(values, includeSalePrice))
    .eq("id", id);
  if (error) throw error;
}

export type BulkChange = Partial<{
  categoryId: string | null;
  unitId: string;
  stageId: string;
  isActive: boolean;
}>;

/** Nguồn ghi vào `nhat_ky_sua.nguon` — giá trị của database, giữ nguyên. */
export type BulkChangeSource = "hang_loat" | "sua_o";

export async function bulkAssign(
  ids: string[],
  change: BulkChange,
  source: BulkChangeSource,
): Promise<number> {
  // RPC nhận object khóa là TÊN CỘT — dịch ở đúng ranh giới này.
  const payload: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(change)) {
    payload[PRODUCT_FIELD_TO_COLUMN[field as EditableProductField]] = value;
  }

  const { data, error } = await getSupabaseBrowserClient().rpc("gan_hang_loat", {
    p_ids: ids,
    p_thay_doi: payload as Json,
    p_nguon: source,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function fetchStageSuggestions(): Promise<StageSuggestion[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "goi_y_cong_doan_theo_duoi",
  );
  if (error) throw error;
  return (data ?? []).map(toStageSuggestion);
}

export async function applyStageSuggestions(ids: string[]): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "ap_dung_goi_y_cong_doan",
    { p_ids: ids },
  );
  if (error) throw error;
  return data ?? 0;
}

export async function confirmReviewed(ids: string[]): Promise<number> {
  const { data, error } = await getSupabaseBrowserClient().rpc("xac_nhan_da_ra", {
    p_ids: ids,
  });
  if (error) throw error;
  return data ?? 0;
}
