"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/features/products/api/product.keys";

import {
  clearNegativeReason,
  postDocumentWithReason,
  saveNegativeReason,
  voidDocument,
} from "../api/document.api";
import { documentKeys } from "../api/document.keys";
import type { NegativeReasonCode } from "../lib/negative-reasons";

/**
 * Hook dùng chung cho ghi sổ/hủy/lý do xuất âm của MỌI chiều chứng từ —
 * `stock-out` (XUAT) và `returns` (TRA_KHACH/TRA_NCC) đều gọi đúng những hàm
 * này thay vì mỗi feature tự viết lại (CLAUDE.md: component/hook dùng ≥ 2
 * feature phải nâng lên chỗ chung — ở đây là `features/documents`, không
 * phải `shared/`, vì logic gắn chặt với domain "chứng từ").
 *
 * Làm mới cache bằng `documentKeys.all = ["documents"]` — TanStack Query
 * khớp mờ theo tiền tố, một lượt invalidate này phủ luôn mọi danh sách/chi
 * tiết/dòng của cả ba chiều nhập/xuất/trả, không cần biết `scope` gọi từ đâu.
 */
function useRefreshDocument(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: documentKeys.lines(id) });
    void queryClient.invalidateQueries({ queryKey: documentKeys.all });
  };
}

export function useSaveNegativeReason(id: string) {
  const refresh = useRefreshDocument(id);
  return useMutation({
    mutationFn: (reason: { code: NegativeReasonCode; note: string | null }) =>
      saveNegativeReason(id, reason),
    onSuccess: refresh,
  });
}

export function useClearNegativeReason(id: string) {
  const refresh = useRefreshDocument(id);
  return useMutation({
    mutationFn: () => clearNegativeReason(id),
    onSuccess: refresh,
  });
}

type ExtraKeys = ReadonlyArray<readonly unknown[]>;

/**
 * Ghi sổ đổi tồn và giá vốn — luôn làm mới cache danh mục sản phẩm.
 * `extraKeys`: mỗi chiều chứng từ có cache riêng cần làm mới thêm ngoài
 * `documents`/`products` — ví dụ `XUAT` gắn tiến độ đơn nên `stock-out`
 * truyền thêm `orderKeys.all`; `returns` không cần gì thêm.
 */
export function usePostDocument(id: string, options?: { extraKeys?: ExtraKeys }) {
  const queryClient = useQueryClient();
  const refresh = useRefreshDocument(id);
  return useMutation({
    mutationFn: (reason?: { code: NegativeReasonCode; note: string | null }) =>
      postDocumentWithReason(id, reason),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      for (const key of options?.extraKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useVoidDocument(id: string, options?: { extraKeys?: ExtraKeys }) {
  const queryClient = useQueryClient();
  const refresh = useRefreshDocument(id);
  return useMutation({
    mutationFn: (reason: string) => voidDocument(id, reason),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      for (const key of options?.extraKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
