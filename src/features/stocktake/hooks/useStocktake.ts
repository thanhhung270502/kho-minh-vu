"use client";

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Database } from "@/types/database.types";
import { inventoryKeys } from "@/features/inventory/api/inventory.keys";

import {
  approveSession,
  deleteCount,
  fetchCountSheet,
  fetchSession,
  fetchSessions,
  fetchStocktakeLookups,
  openSession,
  saveCount,
  setRecount,
  voidSession,
} from "../api/stocktake.api";
import { stocktakeKeys } from "../api/stocktake.keys";
import type { OpenSessionInput } from "../schemas/stocktake.schema";

type ListArgs = Database["public"]["Functions"]["danh_sach_phien_kiem_ke"]["Args"];

export function useStocktakeSessions(args: ListArgs) {
  return useQuery({
    queryKey: stocktakeKeys.sessions(args),
    queryFn: () => fetchSessions(args),
    // Giữ bảng cũ trong lúc tải trang mới: đổi trang/lọc không nháy trắng.
    placeholderData: keepPreviousData,
  });
}

export function useStocktakeSession(sessionId: string) {
  return useQuery({
    queryKey: stocktakeKeys.session(sessionId),
    queryFn: () => fetchSession(sessionId),
    // Ngăn kéo/route chưa có id thật không bắn RPC uuid rỗng (bẫy 10, T-06-45).
    enabled: sessionId !== "",
  });
}

export function useCountSheet(sessionId: string, categoryId?: string) {
  // "" từ Select "tất cả nhóm" và undefined là cùng một bảng — chung một khóa cache.
  const scope = categoryId || undefined;
  return useQuery({
    queryKey: stocktakeKeys.sheet(sessionId, scope),
    queryFn: () => fetchCountSheet(sessionId, scope),
    enabled: sessionId !== "",
  });
}

export function useStocktakeLookups() {
  return useQuery({
    queryKey: stocktakeKeys.lookups,
    queryFn: fetchStocktakeLookups,
  });
}

export function useOpenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenSessionInput) => openSession(input),
    onSuccess: () => {
      // Phiên mới thêm — danh sách phải thấy ngay, chưa có bảng đếm để làm mới.
      void queryClient.invalidateQueries({ queryKey: stocktakeKeys.sessions() });
    },
  });
}

/**
 * Mọi thao tác đổi dòng đếm (lưu, xóa, đếm lại, nạp Excel) làm lệch ba chỗ:
 * bảng đếm, đầu phiên (tiến độ + nhãn trạng thái đọc countedCount/recountCount)
 * và danh sách phiên. Thiếu đầu phiên thì header đứng số cũ (UAT 06 bài 7).
 */
export function invalidateCountProgress(queryClient: QueryClient, sessionId: string) {
  // Tiền tố (không kèm categoryId) — làm mới bảng đếm của mọi nhóm hàng đang mở.
  void queryClient.invalidateQueries({ queryKey: ["stocktake", "sheet", sessionId] });
  void queryClient.invalidateQueries({ queryKey: stocktakeKeys.session(sessionId) });
  void queryClient.invalidateQueries({ queryKey: stocktakeKeys.sessions() });
}

export function useSaveCount(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; quantity: number }) =>
      saveCount({ sessionId, ...input }),
    onSuccess: () => invalidateCountProgress(queryClient, sessionId),
  });
}

export function useDeleteCount(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lineId: string) => deleteCount(lineId),
    onSuccess: () => invalidateCountProgress(queryClient, sessionId),
  });
}

export function useSetRecount(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { lineId: string; value: boolean }) =>
      setRecount(input.lineId, input.value),
    onSuccess: () => invalidateCountProgress(queryClient, sessionId),
  });
}

/**
 * Duyệt phiên ghi sổ thật — tồn kho đổi ngay (nguyên tắc kiến trúc số 1/4), nên
 * ngoài cache kiểm kê còn phải làm mới cache tồn kho/thẻ kho đang mở song song.
 */
export function useApproveSession(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (acceptZeroProductIds: string[]) =>
      approveSession(sessionId, acceptZeroProductIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["stocktake", "sheet", sessionId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["stocktake", "session", sessionId],
      });
      void queryClient.invalidateQueries({ queryKey: stocktakeKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useVoidSession(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => voidSession(sessionId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["stocktake", "session", sessionId],
      });
      void queryClient.invalidateQueries({ queryKey: stocktakeKeys.sessions() });
    },
  });
}
