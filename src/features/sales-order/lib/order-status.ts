import type { StatusTone } from "@/shared/lib/status-tone";
import type { Database } from "@/types/database.types";

/**
 * Trục duyệt của đơn đặt hàng (D-04) — KHÁC trục "đã xuất/còn lại", trục đó
 * tính khi đọc trong `toOrderLine`, không phải enum thứ hai.
 */
export type OrderStatus = Database["public"]["Enums"]["trang_thai_ddh"];

export const ORDER_STATUSES: OrderStatus[] = [
  "TAM",
  "DA_XAC_NHAN",
  "HOAN_THANH",
  "DA_HUY",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  TAM: "Đơn tạm",
  DA_XAC_NHAN: "Đã xác nhận",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  TAM: "pending",
  DA_XAC_NHAN: "active",
  HOAN_THANH: "complete",
  DA_HUY: "muted",
};
