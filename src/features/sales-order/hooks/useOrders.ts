"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { documentKeys } from "@/features/documents/api/document.keys";

import {
  addOrderLine,
  approveOrder,
  closeOrderEarly,
  createIssueFromOrder,
  createOrder,
  deleteOrderLine,
  fetchOrderDetail,
  fetchOrderLines,
  fetchOrders,
  unlockOrder,
  updateOrderHeader,
  updateOrderLine,
} from "../api/order.api";
import { orderKeys } from "../api/order.keys";
import type {
  OrderFilter,
  OrderHeaderInput,
  OrderLineInput,
} from "../schemas/order.schema";

// --- Đọc ---------------------------------------------------------------------

export function useOrders(filter: OrderFilter) {
  return useQuery({
    queryKey: orderKeys.list(filter),
    queryFn: () => fetchOrders(filter),
    placeholderData: keepPreviousData,
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderDetail(id),
    // Ngăn kéo/tạo mới truyền id rỗng — không chặn là bắn RPC uuid rỗng (bẫy 10).
    enabled: id !== "",
  });
}

export function useOrderLines(id: string) {
  return useQuery({
    queryKey: orderKeys.lines(id),
    queryFn: () => fetchOrderLines(id),
    enabled: id !== "",
  });
}

// --- Ghi -----------------------------------------------------------------

/** Sửa dòng/đầu đơn hay đổi trạng thái đều đụng chính đơn đó và cả danh sách. */
function useRefreshOrder(id?: string) {
  const queryClient = useQueryClient();

  return () => {
    if (id) {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lines(id) });
    }
    void queryClient.invalidateQueries({ queryKey: orderKeys.all });
  };
}

export function useCreateOrder() {
  const refresh = useRefreshOrder();
  return useMutation({
    mutationFn: (input: { partnerId: string; deliveryDate?: string | null }) =>
      createOrder(input),
    onSuccess: refresh,
  });
}

export function useUpdateOrderHeader(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (input: Partial<OrderHeaderInput>) =>
      updateOrderHeader(id, input),
    onSuccess: refresh,
  });
}

export function useAddOrderLine(orderId: string) {
  const refresh = useRefreshOrder(orderId);
  return useMutation({
    mutationFn: (line: OrderLineInput) => addOrderLine(orderId, line),
    onSuccess: refresh,
  });
}

export function useUpdateOrderLine(orderId: string) {
  const refresh = useRefreshOrder(orderId);
  return useMutation({
    mutationFn: (input: { id: string; values: Partial<OrderLineInput> }) =>
      updateOrderLine(input.id, input.values),
    onSuccess: refresh,
  });
}

export function useDeleteOrderLine(orderId: string) {
  const refresh = useRefreshOrder(orderId);
  return useMutation({
    mutationFn: (id: string) => deleteOrderLine(id),
    onSuccess: refresh,
  });
}

export function useApproveOrder(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: () => approveOrder(id),
    onSuccess: refresh,
  });
}

export function useUnlockOrder(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (reason: string) => unlockOrder(id, reason),
    onSuccess: refresh,
  });
}

export function useCloseOrderEarly(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (reason: string) => closeOrderEarly(id, reason),
    onSuccess: refresh,
  });
}

/**
 * Phiếu xuất mới phải hiện ngay ở màn `/xuat-kho` — làm mới thêm
 * `documentKeys.all`. Không đụng cache danh mục sản phẩm ở đây: tạo phiếu
 * (chưa ghi sổ) không đổi tồn hay giá vốn, khác `usePostReceipt`/`useVoidReceipt`.
 */
export function useCreateIssueFromOrder(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshOrder(id);

  return useMutation({
    mutationFn: () => createIssueFromOrder(id),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
