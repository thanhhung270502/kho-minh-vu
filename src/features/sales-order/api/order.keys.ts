import type { OrderFilter, OrderStatusCountKey } from "../schemas/order.schema";

/**
 * Đơn đặt hàng không phải chứng từ — không đi qua `documentKeys` của
 * `src/features/documents/`. Cùng hình dạng `receiptKeys` để component quen mắt.
 */
export const orderKeys = {
  all: ["orders"] as const,
  list: (filter: OrderFilter) => ["orders", "list", filter] as const,
  // Key bỏ status/page nên chọn trạng thái hay sang trang không đếm lại.
  statusCounts: (key: OrderStatusCountKey) => ["orders", "status-counts", key] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
  lines: (id: string) => ["orders", "lines", id] as const,
  internalPartners: ["orders", "internal-partners"] as const,
};
