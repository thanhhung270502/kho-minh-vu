"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { documentKeys } from "@/features/documents/api/document.keys";
import { productKeys } from "@/features/products/api/product.keys";

import {
  createReturn,
  deleteReturnLine,
  fetchReturnDetail,
  fetchReturnLines,
  postReturn,
  returnKeys,
  updateReturnLine,
} from "../api/return.api";

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

/** Ghi sổ phiếu trả đổi tồn — làm mới cả cache danh mục lẫn mọi danh sách chứng từ. */
export function usePostReturn(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshReturn(id);
  return useMutation({
    mutationFn: () => postReturn(id),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
