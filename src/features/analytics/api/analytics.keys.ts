import type { Period } from "../types";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const analyticsKeys = {
  all: ["analytics"] as const,
  rows: (period: Period) => ["analytics", "rows", period] as const,
  row: (period: Period, productId: string) => ["analytics", "row", period, productId] as const,
  salesDays: (period: Period) => ["analytics", "sales-days", period] as const,
  settings: ["analytics", "settings"] as const,
};
