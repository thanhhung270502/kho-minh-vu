import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { downloadBlob } from "@/shared/lib/csv";
import type { Json } from "@/types/database.types";

import type { NewProductExportRow, NewProductFileRow } from "../lib/new-product-file";
import type { ImportPayloadRow } from "../lib/new-product-import";
import { ExcelImportError } from "./excel-import.api";

const fileRowSchema = z.object({
  row: z.number(),
  code: z.string(),
  name: z.string(),
  nameFromSheet: z.boolean(),
  stock: z.number(),
  description: z.string(),
  problems: z.array(z.string()),
});

/** Hình dạng jsonb do RPC nhap_ma_hang_moi (0081) trả — khóa của database. */
const rpcResultSchema = z.object({
  da_nap: z.boolean(),
  them: z.number(),
  so_loi: z.number(),
  loi: z.array(
    z.object({ dong: z.number(), ma_hang: z.string(), ten_hang: z.string(), ly_do: z.string() }),
  ),
  chung_tu_id: z.string().nullable(),
  so_ct: z.string().nullable(),
});

export type NewProductImportResult = {
  added: number;
  errors: Array<{ row: number; reason: string }>;
  documentId: string | null;
  docNo: string | null;
};

/** Lỗi trùng danh mục cần cho màn xem trước — giữ nguyên khóa RPC cho `catalogProblemsFrom`. */
export type RpcRowError = { dong: number; ly_do: string };

async function readJsonError(response: Response, fallbackTitle: string): Promise<never> {
  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dang-nhap?tiep_tuc=/danh-muc");
  }
  let title = fallbackTitle;
  let action = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị.";
  try {
    const body = (await response.json()) as { title?: string; action?: string };
    title = body.title ?? title;
    action = body.action ?? action;
  } catch {
    /* server trả không phải JSON — giữ câu mặc định */
  }
  throw new ExcelImportError(title, action, response.status);
}

/** `nameSheetError` khác null = sheet tên hàng chuẩn không tải được, ô tên trống chưa được tự điền. */
export async function readNewProductUpload(
  file: File,
): Promise<{ rows: NewProductFileRow[]; nameSheetError: string | null }> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/danh-muc/doc-file-nhap-moi", { method: "POST", body: form });
  if (!response.ok) return readJsonError(response, "Không đọc được file");
  return z
    .object({ rows: z.array(fileRowSchema), nameSheetError: z.string().nullable() })
    .parse(await response.json());
}

async function callImportRpc(rows: ImportPayloadRow[], warehouseId: string | null, checkOnly: boolean) {
  const { data, error } = await getSupabaseBrowserClient().rpc("nhap_ma_hang_moi", {
    p_dong: rows as unknown as Json,
    // Kiểu sinh ra ghi `string` nhưng RPC nhận null khi file không có tồn.
    p_kho_id: warehouseId as string,
    p_chi_kiem_tra: checkOnly,
  });
  if (error) throw error;
  return rpcResultSchema.parse(data);
}

/** Chế độ kiểm tra — không ghi gì, chỉ lấy lỗi theo dòng. */
export async function checkNewProducts(rows: ImportPayloadRow[]): Promise<RpcRowError[]> {
  const result = await callImportRpc(rows, null, true);
  return result.loi.map((e) => ({ dong: e.dong, ly_do: e.ly_do }));
}

export async function importNewProducts(
  rows: ImportPayloadRow[],
  warehouseId: string | null,
): Promise<NewProductImportResult> {
  const result = await callImportRpc(rows, warehouseId, false);
  return {
    added: result.them,
    errors: result.loi.map((e) => ({ row: e.dong, reason: e.ly_do })),
    documentId: result.chung_tu_id,
    docNo: result.so_ct,
  };
}

export async function downloadNewProductErrors(rows: NewProductExportRow[]): Promise<void> {
  const response = await fetch("/api/danh-muc/file-loi-nhap-moi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!response.ok) return readJsonError(response, "Không tải được file lỗi");
  downloadBlob(await response.blob(), "ma-hang-loi.xlsx");
}
