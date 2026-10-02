import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  toAnalysisRow,
  toSalesDay,
  toSettings,
  type AnalysisRow,
  type AnalysisSettings,
  type Period,
  type SalesDay,
} from "../types";

/** Lớp api (cùng mapper ở types.ts) là chỗ DUY NHẤT chạm tên RPC/cột tiếng Việt. */

export async function fetchAnalysisRows(period: Period): Promise<AnalysisRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("phan_tich_ton_kho", {
    p_so_ngay: period,
  });
  if (error) throw error;
  return (data ?? []).map(toAnalysisRow);
}

export async function fetchSalesDays(period: Period): Promise<SalesDay[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("nhip_ban_theo_ngay", {
    p_so_ngay: period,
  });
  if (error) throw error;
  return (data ?? []).map(toSalesDay);
}

export async function fetchAnalysisSettings(): Promise<AnalysisSettings> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("cau_hinh_phan_tich")
    .select("id, nguong_do, nguong_vang, so_ngay_du_tru, updated_at")
    .single();
  if (error) throw error;
  return toSettings(data);
}

/** Chỉ quản lý sửa được (RLS 0079) — văn phòng gọi sẽ cập nhật 0 dòng, báo lỗi rõ. */
export async function saveAnalysisSettings(settings: AnalysisSettings): Promise<void> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("cau_hinh_phan_tich")
    .update({
      nguong_do: settings.redDays,
      nguong_vang: settings.yellowDays,
      so_ngay_du_tru: settings.coverDays,
    })
    .eq("id", true)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Chỉ quản lý được đổi ngưỡng phân tích.");
}
