import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";

import {
  toInventoryRpcArgs,
  type InventoryFilter,
} from "../schemas/inventory.schema";
import {
  toInventoryRow,
  toReorderSuggestion,
  type InventoryRow,
  type ReorderSuggestion,
  type SuggestionBasis,
} from "../types";

/**
 * Lớp api (cùng mapper trong `types.ts`) là chỗ DUY NHẤT của feature được chạm tên
 * RPC và tên cột tiếng Việt. Hook và component chỉ thấy kiểu miền tiếng Anh.
 *
 * Không lọc gì ở JS: phạm vi kho của thủ kho do chính `danh_sach_ton_kho` áp ở
 * database, quyền duyệt định mức do `dat_dinh_muc` chặn (42501).
 */

/** Một trang của màn duyệt đề xuất định mức — giao diện dùng để dựng phân trang. */
export const REORDER_SUGGESTION_PAGE_SIZE = 200;

export async function fetchInventory(
  filter: InventoryFilter,
): Promise<Page<InventoryRow>> {
  const supabase = getSupabaseBrowserClient();
  const args = toInventoryRpcArgs(filter);
  const { data, error } = await supabase.rpc("danh_sach_ton_kho", args);
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toInventoryRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

/** `basis = null` là "mọi nguồn". Chỉ lấy mã có đề xuất khác định mức đang đặt. */
export async function fetchReorderSuggestions(
  basis: SuggestionBasis | null,
  page: number,
): Promise<Page<ReorderSuggestion>> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("de_xuat_dinh_muc", {
    p_nguon: basis ?? undefined,
    p_chi_khac_hien_tai: true,
    p_trang: page,
    p_kich_thuoc: REORDER_SUGGESTION_PAGE_SIZE,
  });
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toReorderSuggestion),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

/**
 * Chỉ gửi danh sách id — con số định mức do server tính lại từ `de_xuat_dinh_muc`,
 * client không có đường đẩy một số tùy ý vào danh mục. Trả số mã đã cập nhật.
 */
export async function applyReorderLevels(ids: string[]): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("dat_dinh_muc", { p_ids: ids });
  if (error) throw error;

  return Number(data ?? 0);
}
