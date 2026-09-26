import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { StockGroupBy } from "../lib/stock-drilldown";
import {
  toNegativeStockLine,
  toSalesPace,
  toStockByGroupRow,
  type NegativeStockLine,
  type SalesPace,
  type StockByGroupRow,
} from "../types";

/**
 * Lớp api (cùng mapper trong `types.ts`) là chỗ DUY NHẤT của feature được chạm tên
 * RPC và tên cột tiếng Việt. Hook và component chỉ thấy kiểu miền tiếng Anh.
 *
 * Cả ba RPC tự chặn quyền ở database (42501 nếu không phải `quan_ly`, D-12) —
 * không lọc/ẩn gì thêm ở JS.
 */

export async function fetchSalesPace(): Promise<SalesPace> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("nhip_ban");
  if (error) throw error;
  return toSalesPace(data ?? []);
}

export async function fetchNegativeStockReport(
  date: string | null,
): Promise<NegativeStockLine[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("bao_cao_xuat_am", {
    p_ngay: date ?? undefined,
  });
  if (error) throw error;
  return (data ?? []).map(toNegativeStockLine);
}

export async function fetchStockByGroup(
  groupBy: StockGroupBy,
  warehouseId: string | null,
): Promise<StockByGroupRow[]> {
  const supabase = getSupabaseBrowserClient();
  // "category"/"stage" là kiểu miền tiếng Anh của component (StockGroupBy,
  // 07-04); "nhom"/"cong_doan" là hợp đồng tham số p_theo của chính RPC —
  // đổi tên ở đây, KHÔNG đổi tên kiểu miền, để component không phải biết
  // database dùng chữ gì.
  const { data, error } = await supabase.rpc("ton_theo_nhom", {
    p_theo: groupBy === "category" ? "nhom" : "cong_doan",
    p_kho_id: warehouseId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []).map(toStockByGroupRow);
}
