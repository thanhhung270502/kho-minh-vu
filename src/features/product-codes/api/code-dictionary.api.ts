import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/shared/lib/fetch-all-pages";

import type { CodeEntry, CodeKind } from "../lib/sync-entries";

export const codeDictionaryKeys = {
  all: ["code-dictionary"] as const,
};

/** Toàn bộ bộ mã hóa (~700 mục). Lớp api là chỗ duy nhất chạm bảng ma_hoa. */
export async function fetchCodeEntries(): Promise<CodeEntry[]> {
  const rows = await fetchAllPages(async (from, to) => {
    const { data, error } = await getSupabaseBrowserClient()
      .from("ma_hoa")
      .select("loai, ma, ten, ma_hang, thu_tu")
      .order("loai")
      .order("thu_tu")
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });
  return rows.map((r) => ({
    // Cột loai có CHECK 5 giá trị (0085) — kiểu sinh ra chỉ biết `string`.
    loai: r.loai as CodeKind,
    ma: r.ma,
    ten: r.ten,
    ma_hang: r.ma_hang,
    thu_tu: r.thu_tu,
  }));
}
