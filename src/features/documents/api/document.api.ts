import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { Page } from "@/shared/types";

import {
  toDocumentLineUpdate,
  toDocumentUpdate,
  type DocumentHeaderInput,
  type DocumentLineInput,
} from "../schemas/document.schema";
import {
  toDocumentDetail,
  toDocumentLine,
  toDocumentRow,
  type DocumentDetail,
  type DocumentLine,
  type DocumentRow,
} from "../types";

type ListArgs = Database["public"]["Functions"]["danh_sach_chung_tu"]["Args"];

/**
 * Không phụ thuộc loại chứng từ — mỗi màn tự dựng `ListArgs` (`p_loai_ct`) rồi
 * gọi hàm này. `stock-in`/`stock-out`/`returns` chỉ khác nhau ở đối số.
 */
export async function fetchDocuments(args: ListArgs): Promise<Page<DocumentRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_chung_tu",
    args,
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toDocumentRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchDocumentDetail(
  id: string,
): Promise<DocumentDetail | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_chung_tu", {
    p_id: id,
  });
  if (error) throw error;

  const row = data?.[0];
  return row ? toDocumentDetail(row) : null;
}

export async function fetchDocumentLines(id: string): Promise<DocumentLine[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("dong_chung_tu", {
    p_id: id,
  });
  if (error) throw error;
  return (data ?? []).map(toDocumentLine);
}

/** Sửa đầu phiếu: chỉ chạy được khi phiếu còn NHAP_LIEU (policy 0016). */
export async function updateDocumentHeader(
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

export async function addDocumentLine(
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

export async function updateDocumentLine(
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

export async function deleteDocumentLine(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu_dong")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không xóa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
  }
}

export async function postDocument(id: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("ghi_so_chung_tu", {
    p_chung_tu_id: id,
  });
  if (error) throw error;
}

export async function voidDocument(id: string, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("huy_chung_tu", {
    p_chung_tu_id: id,
    p_ly_do: reason,
  });
  if (error) throw error;
}
