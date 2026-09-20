"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addDocumentLine,
  deleteDocumentLine,
  fetchDocumentDetail,
  fetchDocumentLines,
  updateDocumentHeader,
  updateDocumentLine,
} from "@/features/documents/api/document.api";
import { usePostDocument, useVoidDocument } from "@/features/documents/hooks/useDocuments";
import { orderKeys } from "@/features/sales-order/api/order.keys";

import {
  createIssue,
  fetchIssues,
  fetchSimilarCodes,
  proposeMerge,
  type NewIssueInput,
} from "../api/issue.api";
import { issueKeys } from "../api/issue.keys";
import type { DocumentHeaderInput, DocumentLineInput, IssueFilter } from "../schemas/issue.schema";

export function useIssues(filter: IssueFilter) {
  return useQuery({
    queryKey: issueKeys.list(filter),
    queryFn: () => fetchIssues(filter),
    placeholderData: keepPreviousData,
  });
}

export function useIssueDetail(id: string) {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => fetchDocumentDetail(id),
    // Ngăn kéo/tạo mới truyền id rỗng — không chặn là bắn RPC uuid rỗng (bẫy 10).
    enabled: id !== "",
  });
}

export function useIssueLines(id: string) {
  return useQuery({
    queryKey: issueKeys.lines(id),
    queryFn: () => fetchDocumentLines(id),
    enabled: id !== "",
  });
}

/** Sửa dòng/đầu phiếu chỉ đụng chính phiếu đó. */
function useRefreshIssue(id?: string) {
  const queryClient = useQueryClient();

  return () => {
    if (id) {
      void queryClient.invalidateQueries({ queryKey: issueKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: issueKeys.lines(id) });
    }
    void queryClient.invalidateQueries({ queryKey: issueKeys.all });
  };
}

export function useCreateIssue() {
  const refresh = useRefreshIssue();
  return useMutation({
    mutationFn: (input: NewIssueInput) => createIssue(input),
    onSuccess: refresh,
  });
}

export function useUpdateIssueHeader(id: string) {
  const refresh = useRefreshIssue(id);
  return useMutation({
    mutationFn: (input: Partial<DocumentHeaderInput>) =>
      updateDocumentHeader(id, input),
    onSuccess: refresh,
  });
}

/**
 * Phiếu xuất không mang giá — `chung_tu_dong` (dùng chung với `stock-in`) vẫn
 * đòi trường giá ở tầng database, nên đơn giá luôn ép về 0 NGAY TẠI ĐÂY (tầng
 * dữ liệu), để bảng dòng phía trên (`issue-line-table.tsx`) không phải biết
 * tới khái niệm giá cả — component đó chỉ truyền mã hàng, số lượng, kho.
 */
const NO_PRICE = 0;

type IssueLineDraft = Omit<DocumentLineInput, "unitPrice">;

export function useAddIssueLine(documentId: string) {
  const refresh = useRefreshIssue(documentId);
  return useMutation({
    mutationFn: (line: IssueLineDraft) =>
      addDocumentLine(documentId, { ...line, unitPrice: NO_PRICE }),
    onSuccess: refresh,
  });
}

export function useUpdateIssueLine(documentId: string) {
  const refresh = useRefreshIssue(documentId);
  return useMutation({
    mutationFn: (input: { id: string; values: Partial<IssueLineDraft> }) =>
      updateDocumentLine(input.id, { ...input.values, unitPrice: NO_PRICE }),
    onSuccess: refresh,
  });
}

export function useDeleteIssueLine(documentId: string) {
  const refresh = useRefreshIssue(documentId);
  return useMutation({
    mutationFn: (id: string) => deleteDocumentLine(id),
    onSuccess: refresh,
  });
}

/**
 * Ghi sổ/hủy dùng chung hook của `features/documents` (nâng lên plan 04-14 —
 * `returns` dùng lại nguyên vẹn cho `TRA_KHACH`/`TRA_NCC`). Lý do xuất âm
 * (`useSaveNegativeReason`/`useClearNegativeReason`) giờ gọi thẳng từ
 * `@/features/documents/hooks/useDocuments` ở `NegativeStockPanel` — không
 * còn wrapper riêng của `stock-out` vì không còn nơi nào khác cần đổi tên.
 *
 * Ghi sổ phiếu xuất còn gắn đơn: `so_luong_da_xuat` và trạng thái đơn đổi
 * theo (XUAT-05) nên phải làm mới thêm cache đơn.
 */
export function usePostIssue(id: string) {
  return usePostDocument(id, { extraKeys: [orderKeys.all] });
}

/** Hủy phiếu xuất không cần làm mới cache đơn — hành vi giữ nguyên như trước plan 04-14. */
export function useVoidIssue(id: string) {
  return useVoidDocument(id);
}

export function useSimilarCodes(productId: string, warehouseId: string) {
  return useQuery({
    queryKey: issueKeys.similar(productId, warehouseId),
    queryFn: () => fetchSimilarCodes(productId, warehouseId),
    enabled: productId !== "",
  });
}

export function useProposeMerge() {
  return useMutation({
    mutationFn: (input: {
      productIdA: string;
      productIdB: string;
      docId: string;
      note?: string;
    }) => proposeMerge(input.productIdA, input.productIdB, input.docId, input.note),
  });
}
