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
  postDocument,
  updateDocumentHeader,
  updateDocumentLine,
  voidDocument,
} from "@/features/documents/api/document.api";
import { productKeys } from "@/features/products/api/product.keys";

import { createReceipt, fetchReceipts, type NewReceiptHeader } from "../api/receipt.api";
import { receiptKeys } from "../api/receipt.keys";
import type {
  DocumentHeaderInput,
  DocumentLineInput,
  ReceiptFilter,
} from "../schemas/receipt.schema";

export function useReceipts(filter: ReceiptFilter) {
  return useQuery({
    queryKey: receiptKeys.list(filter),
    queryFn: () => fetchReceipts(filter),
    placeholderData: keepPreviousData,
  });
}

export function useReceiptDetail(id: string) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchDocumentDetail(id),
    // Ngăn kéo/tạo mới truyền id rỗng — không chặn là bắn RPC uuid rỗng (bẫy 10).
    enabled: id !== "",
  });
}

export function useReceiptLines(id: string) {
  return useQuery({
    queryKey: receiptKeys.lines(id),
    queryFn: () => fetchDocumentLines(id),
    enabled: id !== "",
  });
}

/** Sửa dòng/đầu phiếu chỉ đụng chính phiếu đó. */
function useRefreshReceipt(id?: string) {
  const queryClient = useQueryClient();

  return () => {
    if (id) {
      void queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: receiptKeys.lines(id) });
    }
    void queryClient.invalidateQueries({ queryKey: receiptKeys.all });
  };
}

export function useCreateReceipt() {
  const refresh = useRefreshReceipt();
  return useMutation({
    mutationFn: (header: NewReceiptHeader) => createReceipt(header),
    onSuccess: refresh,
  });
}

export function useUpdateReceiptHeader(id: string) {
  const refresh = useRefreshReceipt(id);
  return useMutation({
    mutationFn: (input: Partial<DocumentHeaderInput>) =>
      updateDocumentHeader(id, input),
    onSuccess: refresh,
  });
}

export function useAddReceiptLine(documentId: string) {
  const refresh = useRefreshReceipt(documentId);
  return useMutation({
    mutationFn: (line: DocumentLineInput) => addDocumentLine(documentId, line),
    onSuccess: refresh,
  });
}

export function useUpdateReceiptLine(documentId: string) {
  const refresh = useRefreshReceipt(documentId);
  return useMutation({
    mutationFn: (input: { id: string; values: Partial<DocumentLineInput> }) =>
      updateDocumentLine(input.id, input.values),
    onSuccess: refresh,
  });
}

export function useDeleteReceiptLine(documentId: string) {
  const refresh = useRefreshReceipt(documentId);
  return useMutation({
    mutationFn: (id: string) => deleteDocumentLine(id),
    onSuccess: refresh,
  });
}

/**
 * Ghi sổ và hủy làm ĐỔI TỒN và GIÁ VỐN — phải làm mới cả cache danh mục (đã
 * bao gồm thẻ kho), không chỉ cache phiếu.
 */
function useRefreshAfterPosting(id: string) {
  const queryClient = useQueryClient();
  const refreshReceipt = useRefreshReceipt(id);

  return () => {
    refreshReceipt();
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}

export function usePostReceipt(id: string) {
  const refresh = useRefreshAfterPosting(id);
  return useMutation({ mutationFn: () => postDocument(id), onSuccess: refresh });
}

export function useVoidReceipt(id: string) {
  const refresh = useRefreshAfterPosting(id);
  return useMutation({
    mutationFn: (reason: string) => voidDocument(id, reason),
    onSuccess: refresh,
  });
}
