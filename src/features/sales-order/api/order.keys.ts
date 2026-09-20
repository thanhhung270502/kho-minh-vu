import type { OrderFilter } from "../schemas/order.schema";

/**
 * Đơn đặt hàng không phải chứng từ — không đi qua `documentKeys` của
 * `src/features/documents/`. Cùng hình dạng `receiptKeys` để component quen mắt.
 */
export const orderKeys = {
  all: ["orders"] as const,
  list: (filter: OrderFilter) => ["orders", "list", filter] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
  lines: (id: string) => ["orders", "lines", id] as const,
};
