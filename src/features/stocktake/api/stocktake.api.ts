import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { Page } from "@/shared/types";

import type { OpenSessionInput } from "../schemas/stocktake.schema";
import {
  toCountSheetRow,
  toStocktakeSession,
  type CountSheetRow,
  type StocktakeLookups,
  type StocktakeSession,
} from "../types";

/**
 * Lớp api (cùng mapper trong `types.ts`) là chỗ DUY NHẤT của feature được chạm
 * tên RPC và tên cột tiếng Việt (`p_*`, `so_luong_he_thong`, `dong_id`, ...).
 * Hook và component chỉ thấy kiểu miền tiếng Anh. Mọi ghi đi qua `.rpc()` —
 * không `.from()` ghi thẳng `chung_tu_dong` (T-06-44, policy 0065).
 */

type ListArgs = Database["public"]["Functions"]["danh_sach_phien_kiem_ke"]["Args"];

export async function fetchSessions(
  args: ListArgs,
): Promise<Page<StocktakeSession>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_phien_kiem_ke",
    args,
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toStocktakeSession),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchSession(
  sessionId: string,
): Promise<StocktakeSession | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_phien_kiem_ke",
    { p_chung_tu_id: sessionId },
  );
  if (error) throw error;

  const row = data?.[0];
  return row ? toStocktakeSession(row) : null;
}

export async function fetchCountSheet(
  sessionId: string,
  categoryId?: string,
): Promise<CountSheetRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "bang_dem_kiem_ke",
    { p_chung_tu_id: sessionId, p_nhom_hang_id: categoryId },
  );
  if (error) throw error;

  return (data ?? []).map(toCountSheetRow);
}

/**
 * Kho hoạt động + nhóm hàng (danh mục dùng chung) và kho được phân cho chính
 * thủ kho đang đăng nhập (`kho_hien_tai()` đọc `nguoi_dung_kho` — trả rỗng
 * cho quản lý/văn phòng, đúng khuôn `inventory.api.ts fetchAssignedWarehouseIds`).
 */
export async function fetchStocktakeLookups(): Promise<StocktakeLookups> {
  const supabase = getSupabaseBrowserClient();

  const { data: warehouseRows, error: warehouseError } = await supabase
    .from("kho")
    .select("id, ma, ten")
    .eq("dang_hoat_dong", true)
    .order("ma");
  if (warehouseError) throw warehouseError;

  const { data: categoryRows, error: categoryError } = await supabase
    .from("nhom_hang")
    .select("id, ma, ten")
    .order("ten");
  if (categoryError) throw categoryError;

  const { data: assignedWarehouseIds, error: assignedError } =
    await supabase.rpc("kho_hien_tai");
  if (assignedError) throw assignedError;

  const toItem = (row: { id: string; ma: string; ten: string }) => ({
    id: row.id,
    code: row.ma,
    name: row.ten,
  });

  return {
    warehouses: (warehouseRows ?? []).map(toItem),
    categories: (categoryRows ?? []).map(toItem),
    assignedWarehouseIds: assignedWarehouseIds ?? [],
  };
}

export async function openSession(input: OpenSessionInput): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "mo_phien_kiem_ke",
    {
      p_kho_id: input.warehouseId,
      p_nhom_hang_ids: input.categoryIds.length ? input.categoryIds : undefined,
      p_ghi_chu: input.note || undefined,
    },
  );
  if (error) throw error;
  return data.id;
}

export async function saveCount(input: {
  sessionId: string;
  productId: string;
  quantity: number;
}): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("luu_dong_kiem_ke", {
    p_chung_tu_id: input.sessionId,
    p_san_pham_id: input.productId,
    p_so_luong: input.quantity,
  });
  if (error) throw error;
}

export async function deleteCount(lineId: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("xoa_dong_kiem_ke", {
    p_dong_id: lineId,
  });
  if (error) throw error;
}

export async function setRecount(
  lineId: string,
  value: boolean,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("dat_dem_lai", {
    p_dong_id: lineId,
    p_dem_lai: value,
  });
  if (error) throw error;
}

/** `acceptZeroProductIds` = mã chưa đếm mà người duyệt chấp nhận ghi nhận 0. */
export async function approveSession(
  sessionId: string,
  acceptZeroProductIds: string[],
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc(
    "duyet_phien_kiem_ke",
    {
      p_chung_tu_id: sessionId,
      p_chap_nhan_khong_dem: acceptZeroProductIds.length
        ? acceptZeroProductIds
        : undefined,
    },
  );
  if (error) throw error;
}

export async function voidSession(
  sessionId: string,
  reason: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("huy_chung_tu", {
    p_chung_tu_id: sessionId,
    p_ly_do: reason,
  });
  if (error) throw error;
}
