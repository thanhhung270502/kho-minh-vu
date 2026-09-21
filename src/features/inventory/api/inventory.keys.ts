import type { InventoryFilter } from "../schemas/inventory.schema";
import type { SuggestionBasis } from "../types";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const inventoryKeys = {
  all: ["inventory"] as const,
  list: (filter: InventoryFilter) => ["inventory", "list", filter] as const,
  reorderSuggestions: (basis: SuggestionBasis | null, page: number) =>
    ["inventory", "reorder-suggestions", basis, page] as const,
};
