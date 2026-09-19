import type { ProductFilter } from "../schemas/filter.schema";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const productKeys = {
  all: ["products"] as const,
  list: (filter: ProductFilter) => ["products", "list", filter] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  stockCard: (id: string, warehouseId: string | null, page: number) =>
    ["products", "stock-card", id, warehouseId, page] as const,
  stockByWarehouse: (id: string) => ["products", "stock-by-warehouse", id] as const,
  stageSuggestions: ["products", "stage-suggestions"] as const,
  lookups: ["lookups"] as const,
};
