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
import { productKeys } from "@/features/products/api/product.keys";
import { orderKeys } from "@/features/sales-order/api/order.keys";

import {
  createIssue,
  fetchIssues,
  fetchSimilarCodes,
  postIssue,
  proposeMerge,
  saveNegativeReason,
  voidIssue,
  type NewIssueInput,
} from "../api/issue.api";
import { issueKeys } from "../api/issue.keys";
import type { NegativeReasonCode } from "../lib/negative-reasons";
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

export function useSaveNegativeReason(id: string) {
  const refresh = useRefreshIssue(id);
  return useMutation({
    mutationFn: (reason: { code: NegativeReasonCode; note: string | null }) =>
      saveNegativeReason(id, reason),
    onSuccess: refresh,
  });
}

/**
 * Ghi sổ và hủy làm ĐỔI TỒN và GIÁ VỐN — phải làm mới cả cache danh mục sản
 * phẩm, không chỉ cache phiếu (giống `useRefreshAfterPosting` của `stock-in`).
 * Riêng ghi sổ phiếu xuất còn gắn đơn: `so_luong_da_xuat` và trạng thái đơn
 * đổi theo (XUAT-05) nên phải làm mới thêm cache đơn.
 */
function useRefreshAfterPosting(id: string, refreshOrders: boolean) {
  const queryClient = useQueryClient();
  const refreshIssue = useRefreshIssue(id);

  return () => {
    refreshIssue();
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    if (refreshOrders) {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  };
}

export function usePostIssue(id: string) {
  const refresh = useRefreshAfterPosting(id, true);
  return useMutation({
    mutationFn: (reason?: { code: NegativeReasonCode; note: string | null }) =>
      postIssue(id, reason),
    onSuccess: refresh,
  });
}

export function useVoidIssue(id: string) {
  const refresh = useRefreshAfterPosting(id, false);
  return useMutation({
    mutationFn: (reason: string) => voidIssue(id, reason),
    onSuccess: refresh,
  });
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
