// File thuần (bẫy 9): component và script kiểm hàm thuần cùng import.
import type { OrderPermissions } from "../types";
import type { OrderStatus } from "./order-status";

export type OrderAction = "approve" | "complete" | "print" | "unlock" | "close-early" | "cancel";

/**
 * Nút nào hiện ở đầu chi tiết đơn, theo thứ tự hiển thị. Ẩn nút chỉ là trang
 * trí — chặn thật ở RPC (0052, 0078). Nút thiếu quyền KHÔNG render.
 *
 * - Hoàn thành (tạo + ghi sổ hóa đơn): quản lý + văn phòng (`canEdit`).
 * - Xác nhận / Mở khóa / Đóng sớm / Hủy đơn: chỉ quản lý (`canApprove`).
 * - Đơn đã hoàn thành không hủy ở đây — hủy hóa đơn của nó, đơn tự về Đã xác nhận.
 */
export function orderActionsFor(status: OrderStatus, permissions: OrderPermissions): OrderAction[] {
  const actions: OrderAction[] = [];
  switch (status) {
    case "TAM":
      if (permissions.canApprove) actions.push("approve", "cancel");
      break;
    case "DA_XAC_NHAN":
      if (permissions.canEdit) actions.push("complete");
      actions.push("print");
      if (permissions.canApprove) actions.push("unlock", "close-early", "cancel");
      break;
    case "HOAN_THANH":
      actions.push("print");
      break;
    case "DA_HUY":
      break;
  }
  return actions;
}
