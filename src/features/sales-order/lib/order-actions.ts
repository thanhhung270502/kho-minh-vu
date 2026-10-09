// File thuần (bẫy 9): component và script kiểm hàm thuần cùng import.
import type { OrderPermissions } from "../types";
import type { OrderStatus } from "./order-status";

export type OrderAction =
  | "approve"
  | "complete"
  | "print"
  | "unlock"
  | "close-early"
  | "cancel"
  | "edit-invoice";

/**
 * Nút nào hiện ở đầu chi tiết đơn, theo thứ tự hiển thị. Ẩn nút chỉ là trang
 * trí — chặn thật ở RPC (0052, 0078). Nút thiếu quyền KHÔNG render.
 *
 * - Hoàn thành (tạo + ghi sổ hóa đơn): quyền chức vụ "Hoàn thành" (`canComplete`).
 * - Xác nhận / Mở khóa / Đóng sớm: quyền chức vụ "Xác nhận" (`canApprove`).
 * - Hủy đơn: phạm vi quản trị (`canCancel`).
 * - Đơn đã hoàn thành không hủy ở đây — hủy hóa đơn của nó, đơn tự về Đã xác nhận.
 * - Sửa đơn đã hoàn thành = mở sửa hóa đơn (`canEditInvoice`, 0124); đơn đã xác nhận
 *   sửa bằng "unlock" (về Đơn tạm).
 */
export function orderActionsFor(status: OrderStatus, permissions: OrderPermissions): OrderAction[] {
  const actions: OrderAction[] = [];
  switch (status) {
    case "TAM":
      if (permissions.canApprove) actions.push("approve");
      if (permissions.canCancel) actions.push("cancel");
      break;
    case "DA_XAC_NHAN":
      if (permissions.canComplete) actions.push("complete");
      actions.push("print");
      if (permissions.canApprove) actions.push("unlock", "close-early");
      if (permissions.canCancel) actions.push("cancel");
      break;
    case "HOAN_THANH":
      actions.push("print");
      if (permissions.canEditInvoice) actions.push("edit-invoice");
      break;
    case "DA_HUY":
      break;
  }
  return actions;
}
