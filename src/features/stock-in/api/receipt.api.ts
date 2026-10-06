import { fetchDocuments } from "@/features/documents/api/document.api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";

import { toReceiptListRpcArgs, type ReceiptFilter } from "../schemas/receipt.schema";
import type { DocumentRow, ReceiptSource } from "../types";

export {
  addDocumentLine as addReceiptLine,
  deleteDocumentLine as deleteReceiptLine,
  fetchDocumentDetail as fetchReceiptDetail,
  fetchDocumentLines as fetchReceiptLines,
  postDocument as postReceipt,
  updateDocumentHeader as updateReceiptHeader,
  updateDocumentLine as updateReceiptLine,
  voidDocument as voidReceipt,
} from "@/features/documents/api/document.api";

export async function fetchReceipts(
  filter: ReceiptFilter,
): Promise<Page<DocumentRow>> {
  return fetchDocuments(toReceiptListRpcArgs(filter));
}

export type NewReceiptHeader = {
  /** null: bấm "Tạo phiếu nhập" là tạo ngay, chọn nhà cung cấp trong trang phiếu. */
  partnerId: string | null;
  warehouseId: string;
  source: ReceiptSource;
  docDate?: string;
};

/**
 * D-09: tạo phiếu là sinh NGAY chứng từ có số trên server. Số phiếu lấy từ
 * `sinh_so_ct` — không tự ghép ở client, hai người tạo cùng lúc sẽ trùng số.
 *
 * Riêng của NHẬP: chọn nguồn nhà máy/NCC ngoài quyết định tiền tố cấp số.
 */
export async function createReceipt(header: NewReceiptHeader): Promise<string> {
  const supabase = getSupabaseBrowserClient();

  const { data: docNo, error: docNoError } = await supabase.rpc("sinh_so_ct", {
    p_loai: "NHAP",
    p_nguon: header.source === "NHA_MAY" ? "NHA_MAY" : "",
  });
  if (docNoError) throw docNoError;

  const { data, error } = await supabase
    .from("chung_tu")
    .insert({
      so_ct: docNo,
      loai_ct: "NHAP",
      kho_id: header.warehouseId,
      doi_tac_id: header.partnerId,
      nguon_nhap: header.source,
      ...(header.docDate ? { ngay_ct: header.docDate } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

/** Nhà cung cấp mặc định của phiếu nhập mới: nhà máy Vũ Trụ L.An — đổi được trong trang phiếu. */
export const DEFAULT_SUPPLIER_CODE = "NCC000001";

/** id đối tác theo mã; không có / ngừng hoạt động thì null (phiếu tạo chưa có NCC). */
export async function findActivePartnerId(code: string): Promise<string | null> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("doi_tac")
    .select("id")
    .eq("ma", code)
    .eq("dang_hoat_dong", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
