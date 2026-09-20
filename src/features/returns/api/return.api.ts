import { documentKeys, type DocumentScope } from "@/features/documents/api/document.keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const SCOPE: DocumentScope = "tra";

export const returnKeys = {
  all: ["documents", "list", SCOPE] as const,
  detail: (id: string) => documentKeys.detail(id),
  lines: (id: string) => documentKeys.lines(id),
};

export {
  fetchDocumentDetail as fetchReturnDetail,
  fetchDocumentLines as fetchReturnLines,
  postDocument as postReturn,
  updateDocumentLine as updateReturnLine,
  deleteDocumentLine as deleteReturnLine,
  voidDocument as voidReturn,
} from "@/features/documents/api/document.api";

/**
 * D-15: sinh phiếu trả từ chứng từ gốc đã ghi sổ — phiếu xuất đã ghi sổ →
 * "Khách trả hàng" (`TRA_KHACH`); phiếu nhập đã ghi sổ → "Trả NCC" (`TRA_NCC`).
 * Loại phiếu trả do RPC `tao_phieu_tra` suy từ `loai_ct` của chứng từ gốc —
 * KHÔNG truyền loại từ client, bớt một đường client truyền sai.
 */
export async function createReturn(sourceDocId: string): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("tao_phieu_tra", {
    p_goc_id: sourceDocId,
  });
  if (error) throw error;
  if (!data) {
    throw new Error("Không tạo được phiếu trả từ chứng từ này.");
  }
  return data.id;
}
