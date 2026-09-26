// File thuần, KHÔNG "use client" — các thẻ số của trang tổng quan (Server
// Component) dựng link drill-down bằng hàm này trước khi giao cho client.
import {
  DEFAULT_INVENTORY_FILTER,
  writeInventoryFilterToUrl,
  type StockStatus,
} from "@/features/inventory/schemas/inventory.schema";

export type StockGroupBy = "category" | "stage";

/**
 * Dựng URL sang `/ton-kho` cho các thẻ drill-down của trang tổng quan.
 * Luôn đi qua `writeInventoryFilterToUrl` — KHÔNG tự ghép chuỗi — để bộ lọc
 * mở ra đúng khớp con số đã đếm (D-08). KHÔNG đặt `tradingStatus`: giữ mặc
 * định "đang kinh doanh" của `DEFAULT_INVENTORY_FILTER`, đúng phạm vi mà RPC
 * `ton_theo_nhom` đếm (D-08/D-17) — đặt tường minh ở đây sẽ dễ lệch nếu mặc
 * định đổi mà quên sửa cả hai chỗ.
 */
export function buildInventoryDrilldownUrl({
  groupBy,
  groupId,
  warehouseId,
  stockStatus,
}: {
  groupBy: StockGroupBy;
  groupId: string;
  warehouseId: string | null;
  stockStatus: StockStatus | null;
}): string {
  const params = writeInventoryFilterToUrl({
    ...DEFAULT_INVENTORY_FILTER,
    categoryId: groupBy === "category" ? groupId : null,
    stageId: groupBy === "stage" ? groupId : null,
    warehouseId,
    stockStatus,
  });

  const query = params.toString();
  return query ? `/ton-kho?${query}` : "/ton-kho";
}
