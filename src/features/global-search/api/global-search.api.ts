import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { toGlobalSearchResult, type GlobalSearchResult } from "../types";

// Lớp api là chỗ DUY NHẤT chạm tên RPC.
export async function searchEverything(query: string): Promise<GlobalSearchResult[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("tim_kiem_toan_cuc", {
    p_tu_khoa: query,
    p_gioi_han: 5,
  });
  if (error) throw error;
  return (data ?? [])
    .map(toGlobalSearchResult)
    .filter((r): r is GlobalSearchResult => r !== null);
}
