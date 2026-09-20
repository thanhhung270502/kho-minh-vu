"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  usePostDocument,
  useVoidDocument,
} from "@/features/documents/hooks/useDocuments";

import {
  createReturn,
  deleteReturnLine,
  fetchReturnDetail,
  fetchReturnLines,
  returnKeys,
  updateReturnLine,
} from "../api/return.api";

export {
  useSaveNegativeReason,
  useClearNegativeReason,
} from "@/features/documents/hooks/useDocuments";

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceDocId: string) => createReturn(sourceDocId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: returnKeys.all });
    },
  });
}

export function useReturnDetail(id: string) {
  return useQuery({
    queryKey: returnKeys.detail(id),
    queryFn: () => fetchReturnDetail(id),
    // Ngăn kéo/tạo mới truyền id rỗng — không chặn là bắn RPC uuid rỗng (bẫy 10).
    enabled: id !== "",
  });
}

export function useReturnLines(id: string) {
  return useQuery({
    queryKey: returnKeys.lines(id),
    queryFn: () => fetchReturnLines(id),
    enabled: id !== "",
  });
}

function useRefreshReturn(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: returnKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: returnKeys.lines(id) });
    void queryClient.invalidateQueries({ queryKey: returnKeys.all });
  };
}

export function useUpdateReturnLine(id: string) {
  const refresh = useRefreshReturn(id);
  return useMutation({
    mutationFn: (input: { id: string; values: Parameters<typeof updateReturnLine>[1] }) =>
      updateReturnLine(input.id, input.values),
    onSuccess: refresh,
  });
}

export function useDeleteReturnLine(id: string) {
  const refresh = useRefreshReturn(id);
  return useMutation({
    mutationFn: (lineId: string) => deleteReturnLine(lineId),
    onSuccess: refresh,
  });
}

/**
 * Ghi sổ/hủy phiếu trả — dùng chung hook của `features/documents` (nâng lên
 * plan 04-14, xem `stock-out/hooks/useIssues.ts`). Không có `extraKeys`
 * riêng: phiếu trả không gắn tiến độ đơn nào cần làm mới thêm.
 */
export function usePostReturn(id: string) {
  return usePostDocument(id);
}

export function useVoidReturn(id: string) {
  return useVoidDocument(id);
}
