import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCodeSyncEnv } from "@/lib/env-server";
import type { Json } from "@/types/database.types";

import { SourceSheetError, readSourceSheet } from "../lib/source-sheet";
import { toSyncEntries } from "../lib/sync-entries";

// Google đôi khi treo kết nối; không có hạn thì job cron chạy tới khi Vercel cắt.
const FETCH_TIMEOUT_MS = 15_000;

export type CodeSyncResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; stage: "config" | "fetch" | "format" | "data"; message: string };

/**
 * Tải sheet quy chuẩn mã → kiểm cấu trúc → RPC dong_bo_ma_hoa (một transaction).
 * Lỗi định dạng dừng TRƯỚC khi gọi RPC; lỗi dữ liệu (thiếu loại, bị cắt…) do RPC
 * quyết định và tự ghi nhật ký. `source` vào ma_hoa_dong_bo.nguon.
 */
export async function syncCodeDictionary(source: "cron" | "tay"): Promise<CodeSyncResult> {
  const { MA_HOA_SHEET_CSV_URL } = getCodeSyncEnv();
  if (!MA_HOA_SHEET_CSV_URL) {
    return {
      ok: false,
      stage: "config",
      message: "Chưa cấu hình MA_HOA_SHEET_CSV_URL (link CSV của tab quy chuẩn mã). Khai biến này rồi deploy lại.",
    };
  }
  let response: Response;
  try {
    response = await fetch(MA_HOA_SHEET_CSV_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    // Mạng lỗi / quá thời gian: cùng giai đoạn "fetch" như HTTP lỗi, không để văng
    // thành 500 trần. Giai đoạn fetch chưa chạm DB nên không có dòng ma_hoa_dong_bo
    // (nhật ký chỉ do RPC ghi) — giống hệt nhánh HTTP lỗi bên dưới.
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    return {
      ok: false,
      stage: "fetch",
      message: timedOut
        ? `Sheet quy chuẩn mã không phản hồi sau ${FETCH_TIMEOUT_MS / 1000} giây. Thử lại sau ít phút.`
        : "Không kết nối được tới Google Sheets để tải sheet quy chuẩn mã. Thử lại sau ít phút.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      stage: "fetch",
      message: `Không tải được sheet quy chuẩn mã (HTTP ${response.status}). Kiểm link MA_HOA_SHEET_CSV_URL còn đúng và tab vẫn đang "Xuất bản lên web".`,
    };
  }

  let csv: string;
  try {
    // Hạn 15 giây phủ cả lúc đọc thân phản hồi, nên đọc cũng có thể bị hủy.
    csv = await response.text();
  } catch {
    return { ok: false, stage: "fetch", message: "Tải sheet quy chuẩn mã bị ngắt giữa chừng. Thử lại sau ít phút." };
  }

  let entries;
  try {
    entries = toSyncEntries(readSourceSheet(csv));
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
