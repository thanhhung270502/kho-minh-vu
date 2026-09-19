import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";

import {
  toDocumentLineUpdate,
  toDocumentUpdate,
  toReceiptListRpcArgs,
  type DocumentHeaderInput,
  type DocumentLineInput,
  type ReceiptFilter,
} from "../schemas/receipt.schema";
import {
  toDocumentDetail,
  toDocumentLine,
  toDocumentRow,
  type DocumentDetail,
  type DocumentLine,
  type DocumentRow,
  type ReceiptSource,
} from "../types";

export async function fetchReceipts(
  filter: ReceiptFilter,
): Promise<Page<DocumentRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_chung_tu",
    toReceiptListRpcArgs(filter),
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toDocumentRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchReceiptDetail(
  id: string,
): Promise<DocumentDetail | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_chung_tu", {
    p_id: id,
  });
  if (error) throw error;

  const row = data?.[0];
  return row ? toDocumentDetail(row) : null;
}

export async function fetchReceiptLines(id: string): Promise<DocumentLine[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("dong_chung_tu", {
    p_id: id,
  });
  if (error) throw error;
  return (data ?? []).map(toDocumentLine);
}

export type NewReceiptHeader = {
  partnerId: string;
  warehouseId: string;
  source: ReceiptSource;
  docDate?: string;
};

/**
 * D-09: tạo phiếu là sinh NGAY chứng từ có số trên server. Số phiếu lấy từ
 * `sinh_so_ct` — không tự ghép ở client, hai người tạo cùng lúc sẽ trùng số.
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

/** Sửa đầu phiếu: chỉ chạy được khi phiếu còn NHAP_LIEU (policy 0016). */
export async function updateReceiptHeader(
  id: string,
  input: Partial<DocumentHeaderInput>,
): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu")
    .update(toDocumentUpdate(input), { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không lưu được — phiếu đã ghi sổ hoặc tài khoản không có quyền sửa.",
    );
  }
}

export async function addReceiptLine(
  documentId: string,
  line: DocumentLineInput,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .insert({
      chung_tu_id: documentId,
      san_pham_id: line.productId,
      so_luong: line.quantity,
      don_gia: line.unitPrice,
      thanh_tien: Math.round(line.quantity * line.unitPrice),
      kho_id: line.warehouseId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateReceiptLine(
  id: string,
  line: Partial<DocumentLineInput>,
): Promise<void> {
  const payload = toDocumentLineUpdate(line);
  if (line.quantity !== undefined && line.unitPrice !== undefined) {
    payload.thanh_tien = Math.round(line.quantity * line.unitPrice);
  }

  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .update(payload, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không sửa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
  }
}

export async function deleteReceiptLine(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không xóa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
  }
}

export async function postReceipt(id: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("ghi_so_chung_tu", {
    p_chung_tu_id: id,
  });
  if (error) throw error;
}

export async function voidReceipt(id: string, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("huy_chung_tu", {
    p_chung_tu_id: id,
    p_ly_do: reason,
  });
  if (error) throw error;
}
