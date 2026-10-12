// File thuần (bẫy 9): component client và Route Handler cùng import.
import type { StocktakeSession } from "../types";

/** Nhãn phạm vi phiên: "N mã chọn" (0129), tên các nhóm hàng, hoặc "Toàn kho". */
export function scopeLabel(
  session: Pick<StocktakeSession, "categoryNames" | "selectedProductCount">,
): string {
  if (session.selectedProductCount !== null) {
    return `${session.selectedProductCount.toLocaleString("vi-VN")} mã chọn`;
  }
  return session.categoryNames ?? "Toàn kho";
}
