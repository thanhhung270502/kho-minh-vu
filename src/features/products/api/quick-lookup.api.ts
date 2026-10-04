import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { toQuickLookupInsert, type QuickLookupValues } from "../schemas/quick-lookup.schema";

export type QuickLookupTable = "nhom_hang" | "don_vi_tinh" | "cong_doan";

/** Ghi thẳng qua RLS (quyền Tạo mã hàng, 0083) — cùng quyền với sửa mã hàng. */
export async function createQuickLookup(
  table: QuickLookupTable,
  values: QuickLookupValues,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from(table)
    .insert(toQuickLookupInsert(values))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
