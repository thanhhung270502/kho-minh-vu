import { fetchDocuments } from "@/features/documents/api/document.api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";
import type { DocumentRow } from "@/features/documents/types";

import { toIssueListRpcArgs, type IssueFilter } from "../schemas/issue.schema";
import { toSimilarCode, type IssueRow, type SimilarCode } from "../types";

export {
  addDocumentLine as addIssueLine,
  deleteDocumentLine as deleteIssueLine,
  fetchDocumentDetail as fetchIssueDetail,
  fetchDocumentLines as fetchIssueLines,
  updateDocumentHeader as updateIssueHeader,
  updateDocumentLine as updateIssueLine,
  saveNegativeReason,
  clearNegativeReason,
  // `postIssue`/`voidIssue` giữ tên cũ cho `hooks/useIssues.ts` — logic thật
  // đã nâng lên `features/documents` (dùng chung với `stock-in`/`returns`).
  postDocumentWithReason as postIssue,
  voidDocument as voidIssue,
} from "@/features/documents/api/document.api";

// Hàm thuần — nhận tham số, trả dữ liệu đã có kiểu. Không JSX, không hook.
// Mọi lượt gọi Supabase đều kiểm `error`: supabase-js không tự ném lỗi.

export async function fetchIssues(filter: IssueFilter): Promise<Page<IssueRow>> {
  const page = await fetchDocuments(toIssueListRpcArgs(filter));
  return { rows: await attachOrderNo(page.rows), total: page.total };
}

/**
 * `danh_sach_chung_tu` dùng chung với `stock-in`/`returns` nên không trả đơn
 * gốc. Nối thêm bằng hai lượt đọc riêng của chiều xuất (`chung_tu.don_dat_hang_id`
 * rồi `don_dat_hang.so_dh`) — cả hai bảng đều cho phép SELECT theo phạm vi hiện
 * tại (policy 0016), không cần sửa RPC chỉ để phục vụ một cột của một màn.
 */
async function attachOrderNo(rows: DocumentRow[]): Promise<IssueRow[]> {
  if (rows.length === 0) return [];

  const supabase = getSupabaseBrowserClient();
  const ids = rows.map((row) => row.id);

  const { data: docs, error: docsError } = await supabase
    .from("chung_tu")
    .select("id, don_dat_hang_id")
    .in("id", ids);
  if (docsError) throw docsError;

  const orderIdByDocId = new Map(
    (docs ?? []).map((doc) => [doc.id, doc.don_dat_hang_id] as const),
  );
  const orderIds = Array.from(
    new Set(
      Array.from(orderIdByDocId.values()).filter(
        (id): id is string => id !== null,
      ),
    ),
  );

  const orderNoById = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("don_dat_hang")
      .select("id, so_dh")
      .in("id", orderIds);
    if (ordersError) throw ordersError;
    for (const order of orders ?? []) orderNoById.set(order.id, order.so_dh);
  }

  return rows.map((row) => {
    const orderId = orderIdByDocId.get(row.id) ?? null;
    return {
      ...row,
      orderId,
      orderNo: orderId ? (orderNoById.get(orderId) ?? null) : null,
    };
  });
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

/** Kết quả ghi đề nghị — `createdAt` cho phía giao diện biết đây là dòng vừa
 * tạo hay dòng đã có sẵn (bấm lần hai trên cùng cặp, unique index có điều
 * kiện trả về đúng dòng đang chờ thay vì tạo dòng mới). */
export type ProposeMergeResult = { id: string; createdAt: string };

/** D-14: chỉ ghi lại đề nghị gộp, không gộp gì — Phase 4 không thực hiện gộp thật. */
export async function proposeMerge(
  productIdA: string,
  productIdB: string,
  docId: string,
  note?: string,
): Promise<ProposeMergeResult> {
  const { data, error } = await getSupabaseBrowserClient().rpc("ghi_de_nghi_gop_ma", {
    p_san_pham_id_a: productIdA,
    p_san_pham_id_b: productIdB,
    p_chung_tu_id: docId,
    ...(note ? { p_ghi_chu: note } : {}),
  });
  if (error) throw error;
  return { id: data.id, createdAt: data.created_at };
}
