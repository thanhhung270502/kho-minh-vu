// File thuần, KHÔNG "use client" — các thẻ số của trang tổng quan (Server
// Component) dựng link drill-down bằng hàm này trước khi giao cho client.
import {
  DEFAULT_PRODUCT_FILTER,
  writeFilterToUrl,
  type StockStatus,
} from "@/features/products/schemas/filter.schema";

export type StockGroupBy = "category" | "stage";

/**
 * Dựng URL sang Danh sách hàng hóa cho các thẻ drill-down của trang tổng quan
 * (trang `/ton-kho` đã gỡ ở Phase 10). Luôn đi qua `writeFilterToUrl` — KHÔNG
 * tự ghép chuỗi. KHÔNG đặt `tradingStatus`: giữ mặc định "đang kinh doanh",
 * đúng phạm vi RPC `ton_theo_nhom` đếm (D-08/D-17). Danh mục chưa có lọc theo
 * kho, nên khi trang tổng quan đang chọn một kho thì danh sách mở ra là tồn
 * mọi kho — đã chốt chấp nhận ở Phase 10.
 */
export function buildCatalogDrilldownUrl({
  groupBy,
  groupId,
  stockStatus,
}: {
  groupBy: StockGroupBy;
  groupId: string;
  stockStatus: StockStatus | null;
}): string {
  const params = writeFilterToUrl({
    ...DEFAULT_PRODUCT_FILTER,
    categoryId: groupBy === "category" ? groupId : null,
    stageId: groupBy === "stage" ? groupId : null,
    stockStatus,
  });

  const query = params.toString();
  return query ? `/danh-muc?${query}` : "/danh-muc";
}
