import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCodeSyncEnv } from "@/lib/env-server";
import type { Json } from "@/types/database.types";

import { SourceSheetError, readSourceSheet } from "../lib/source-sheet";
import { toSyncEntries } from "../lib/sync-entries";

export type CodeSyncResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; stage: "fetch" | "format" | "data"; message: string };

/**
 * Tải sheet quy chuẩn mã → kiểm cấu trúc → RPC dong_bo_ma_hoa (một transaction).
 * Lỗi định dạng dừng TRƯỚC khi gọi RPC; lỗi dữ liệu (thiếu loại, bị cắt…) do RPC
 * quyết định và tự ghi nhật ký. `source` vào ma_hoa_dong_bo.nguon.
 */
export async function syncCodeDictionary(source: "cron" | "tay"): Promise<CodeSyncResult> {
  const { MA_HOA_SHEET_ID } = getCodeSyncEnv();
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${MA_HOA_SHEET_ID}/export?format=csv`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      ok: false,
      stage: "fetch",
      message: `Không tải được sheet quy chuẩn mã (HTTP ${response.status}). Kiểm sheet còn để "ai có link đều xem được".`,
    };
  }

  let entries;
  try {
    entries = toSyncEntries(readSourceSheet(await response.text()));
  } catch (e) {
    if (e instanceof SourceSheetError) return { ok: false, stage: "format", message: e.message };
    throw e;
  }

  // Service role: job chạy không có phiên người dùng. RPC tự kiểm quyền (0085).
  const { data, error } = await createSupabaseAdminClient().rpc("dong_bo_ma_hoa", {
    // Khóa jsonb loai/ma/ten/ma_hang/thu_tu là hợp đồng với RPC.
    p_ban_ghi: entries as unknown as Json,
    p_nguon: source,
  });
  if (error) throw error;

  const result = data as { thanh_cong: boolean; so_muc: Record<string, number>; loi: string | null };
  return result.thanh_cong
    ? { ok: true, counts: result.so_muc }
    : { ok: false, stage: "data", message: result.loi ?? "Dữ liệu sheet không hợp lệ" };
}
