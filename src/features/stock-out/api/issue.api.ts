import { fetchDocuments } from "@/features/documents/api/document.api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";

import { toIssueListRpcArgs, type IssueFilter } from "../schemas/issue.schema";
import type { NegativeReasonCode } from "../lib/negative-reasons";
import { toSimilarCode, type IssueRow, type SimilarCode } from "../types";

import { postDocument, voidDocument } from "@/features/documents/api/document.api";

export {
  addDocumentLine as addIssueLine,
  deleteDocumentLine as deleteIssueLine,
  fetchDocumentDetail as fetchIssueDetail,
  fetchDocumentLines as fetchIssueLines,
  updateDocumentHeader as updateIssueHeader,
  updateDocumentLine as updateIssueLine,
} from "@/features/documents/api/document.api";

// Hàm thuần — nhận tham số, trả dữ liệu đã có kiểu. Không JSX, không hook.
// Mọi lượt gọi Supabase đều kiểm `error`: supabase-js không tự ném lỗi.

export async function fetchIssues(filter: IssueFilter): Promise<Page<IssueRow>> {
  return fetchDocuments(toIssueListRpcArgs(filter));
}

export type NewIssueInput = {
  partnerId: string;
  warehouseId: string;
  docDate?: string;
};

/**
 * XUAT-02: phiếu xuất không cần đơn. Cấp số trên server (`sinh_so_ct`) rồi
 * insert trong cùng một hàm — không ghép số ở client, hai người tạo cùng lúc
 * sẽ trùng số nếu làm vậy.
 */
export async function createIssue(input: NewIssueInput): Promise<string> {
  const supabase = getSupabaseBrowserClient();

  const { data: docNo, error: docNoError } = await supabase.rpc("sinh_so_ct", {
    p_loai: "XUAT",
  });
  if (docNoError) throw docNoError;

  const { data, error } = await supabase
    .from("chung_tu")
    .insert({
      so_ct: docNo,
      loai_ct: "XUAT",
      kho_id: input.warehouseId,
      doi_tac_id: input.partnerId,
      ...(input.docDate ? { ngay_ct: input.docDate } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

/** Lưu lý do xuất âm (D-11) vào đầu phiếu. Ghi chú `null` khi không phải "Khác". */
export async function saveNegativeReason(
  id: string,
  reason: { code: NegativeReasonCode; note: string | null },
): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu")
    .update(
      { ly_do_xuat_am: reason.code, ghi_chu_ly_do: reason.note },
      { count: "exact" },
    )
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không lưu được lý do xuất âm — phiếu đã ghi sổ hoặc thiếu quyền.",
    );
  }
}

/** Người dùng bỏ chọn lý do — phải xóa cả hai cột, không thì phiếu sau vẫn mang lý do cũ. */
export async function clearNegativeReason(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chung_tu")
    .update({ ly_do_xuat_am: null, ghi_chu_ly_do: null }, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không xóa được lý do xuất âm — phiếu đã ghi sổ hoặc thiếu quyền.",
    );
  }
}

/**
 * Hàm ghi sổ ở tầng database đọc `ly_do_xuat_am` từ đầu phiếu ĐÃ LƯU, không
 * nhận lý do qua tham số. Vì vậy lý do (nếu có) phải được lưu TRƯỚC khi gọi
 * `postDocument` — sai thứ tự này thì ghi sổ trả về 23514 "phải chọn lý do"
 * dù người dùng đã chọn.
 */
export async function postIssue(
  id: string,
  reason?: { code: NegativeReasonCode; note: string | null },
): Promise<void> {
  if (reason) {
    await saveNegativeReason(id, reason);
  }
  await postDocument(id);
}

export async function voidIssue(id: string, reason: string): Promise<void> {
  await voidDocument(id, reason);
}

/** D-14: gợi ý mã gần giống còn tồn khi một dòng làm tồn âm. */
export async function fetchSimilarCodes(
  productId: string,
  warehouseId: string,
): Promise<SimilarCode[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("goi_y_ma_trung", {
    p_san_pham_id: productId,
    p_kho_id: warehouseId,
  });
  if (error) throw error;
  return (data ?? []).map(toSimilarCode);
}

/** D-14: chỉ ghi lại đề nghị gộp, không gộp gì — Phase 4 không thực hiện gộp thật. */
export async function proposeMerge(
  productIdA: string,
  productIdB: string,
  docId: string,
  note?: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("ghi_de_nghi_gop_ma", {
    p_san_pham_id_a: productIdA,
    p_san_pham_id_b: productIdB,
    p_chung_tu_id: docId,
    ...(note ? { p_ghi_chu: note } : {}),
  });
  if (error) throw error;
}
