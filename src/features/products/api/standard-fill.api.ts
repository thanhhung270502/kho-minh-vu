import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/shared/lib/fetch-all-pages";
import type { Json } from "@/types/database.types";

import type { StandardFillChange, StandardFillSource } from "../lib/standard-fill";
import type { StageLookupItem } from "../types";

/**
 * Toàn bộ mã (kể cả ngừng kinh doanh) để tách lại theo quy chuẩn. Liệt kê cột
 * vì san_pham chỉ có quyền SELECT theo cột (bẫy 5). Mã xử lý quy chuẩn tra từ
 * danh mục xử lý đã tải sẵn, không join.
 */
export async function fetchStandardFillSources(
  stages: ReadonlyArray<StageLookupItem>,
): Promise<StandardFillSource[]> {
  const standardCodeOf = new Map(stages.map((s) => [s.id, s.standardCode]));
  const rows = await fetchAllPages(async (from, to) => {
    const { data, error } = await getSupabaseBrowserClient()
      .from("san_pham")
      .select("id, ma_hang, ten_hang, hang_xe, dong_xe, linh_kien, cong_doan_id, truong_chon_tay")
      .order("ma_hang")
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.ma_hang,
    name: r.ten_hang,
    brandCode: r.hang_xe,
    modelCode: r.dong_xe,
    partCode: r.linh_kien,
    finishCode: (r.cong_doan_id ? standardCodeOf.get(r.cong_doan_id) : null) ?? null,
    manualFields: r.truong_chon_tay ?? [],
  }));
}

/** Một lô (≤ 1.000 dòng). Trả số mã thật sự đổi. */
export async function fillStandardFields(changes: ReadonlyArray<StandardFillChange>): Promise<number> {
  // Khóa snake_case là hợp đồng jsonb của RPC dien_quy_chuan (0087).
  const payload = changes.map((c) => ({
    id: c.id,
    hang_xe: c.brandCode ?? null,
    dong_xe: c.modelCode ?? null,
    linh_kien: c.partCode ?? null,
    ma_xu_ly: c.finishCode ?? null,
  }));
  const { data, error } = await getSupabaseBrowserClient().rpc("dien_quy_chuan", {
    p_dong: payload as Json,
  });
  if (error) throw error;
  const result = data as { so_ma_doi?: number } | null;
  return result?.so_ma_doi ?? 0;
}
