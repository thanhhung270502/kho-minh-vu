import type { ProductFilter } from "../schemas/filter.schema";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const productKeys = {
  all: ["products"] as const,
  /** Tiền tố của `list(filter)` — dùng để làm mới mọi trang bảng danh mục mà không đụng detail/thẻ kho. */
  lists: ["products", "list"] as const,
  list: (filter: ProductFilter) => ["products", "list", filter] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  stockCard: (id: string, warehouseId: string | null, page: number) =>
    ["products", "stock-card", id, warehouseId, page] as const,
  stockByWarehouse: (id: string) => ["products", "stock-by-warehouse", id] as const,
  /** Toàn bộ mã cho "Điền quy chuẩn từ mã" — nằm dưới `all` để mọi mutation làm mới. */
  standardFillSources: ["products", "standard-fill-sources"] as const,
  comboComponents: (id: string) => ["products", "combo-components", id] as const,
  /** Sheet tên hàng chuẩn — không nằm dưới `all`: lưu mã hàng không làm đổi sheet. */
  nameSheet: ["product-name-sheet"] as const,
  lookups: ["lookups"] as const,
};
