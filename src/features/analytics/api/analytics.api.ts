import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/shared/lib/fetch-all-pages";

import {
  toAnalysisRow,
  toSettings,
  type AnalysisRow,
  type AnalysisSettings,
  type Period,
} from "../types";

/** Lớp api (cùng mapper ở types.ts) là chỗ DUY NHẤT chạm tên RPC/cột tiếng Việt. */

/** Toàn danh mục (3.266 mã) — vượt max_rows 1000 nên tải theo trang. */
export async function fetchAnalysisRows(period: Period): Promise<AnalysisRow[]> {
  const rows = await fetchAllPages(async (from, to) => {
    const { data, error } = await getSupabaseBrowserClient()
      .rpc("phan_tich_ton_kho", { p_so_ngay: period })
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });
  return rows.map(toAnalysisRow);
}

export async function fetchAnalysisSettings(): Promise<AnalysisSettings> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("cau_hinh_phan_tich")
    .select("id, nguong_do, nguong_vang, so_ngay_du_tru, updated_at")
    .single();
  if (error) throw error;
  return toSettings(data);
}

