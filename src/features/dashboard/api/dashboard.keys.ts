import type { StockGroupBy } from "../lib/stock-drilldown";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  flow: (days: number) => [...dashboardKeys.all, "flow", days] as const,
  negativeStock: (date: string | null) =>
    [...dashboardKeys.all, "negative-stock", date] as const,
  stockByGroup: (groupBy: StockGroupBy, warehouseId: string | null) =>
    [...dashboardKeys.all, "stock-by-group", groupBy, warehouseId] as const,
};
