import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { StockGroupBy } from "../lib/stock-drilldown";
import {
  toFlowDay,
  toIdleProduct,
  toNegativeStockLine,
  toOverviewKpis,
  toSalesPace,
  toStockByGroupRow,
  type FlowDay,
  type IdleProduct,
  type NegativeStockLine,
  type OverviewKpis,
  type SalesPace,
  type StockByGroupRow,
} from "../types";

/**
 * Lớp api (cùng mapper trong `types.ts`) là chỗ DUY NHẤT của feature được chạm tên
 * RPC và tên cột tiếng Việt. Hook và component chỉ thấy kiểu miền tiếng Anh.
 *
 * Các RPC tự chặn quyền ở database (42501 nếu thiếu quyền; các RPC 3b dùng
 * `co_quyen('xem_dashboard')`, 0083/0093) — không lọc/ẩn gì thêm ở JS.
 */

export type FlowRange = 7 | 30 | 90;

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

export async function fetchOverviewKpis(): Promise<OverviewKpis> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("tong_quan_chi_so");
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Tổng quan: không nhận được chỉ số");
  return toOverviewKpis(row);
}

export async function fetchFlowByDay(days: FlowRange): Promise<FlowDay[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("nhap_xuat_theo_ngay", { p_so_ngay: days });
  if (error) throw error;
  return (data ?? []).map(toFlowDay);
}

export async function fetchIdleProducts(): Promise<IdleProduct[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("khong_luan_chuyen", {
    p_so_ngay: 30,
    p_gioi_han: 8,
  });
  if (error) throw error;
  return (data ?? []).map(toIdleProduct);
}
