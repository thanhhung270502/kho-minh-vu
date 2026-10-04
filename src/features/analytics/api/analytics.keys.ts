import type { Period } from "../types";

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const analyticsKeys = {
  all: ["analytics"] as const,
  rows: (period: Period) => ["analytics", "rows", period] as const,
  settings: ["analytics", "settings"] as const,
  period: (from: string, to: string, warehouseId: string | null) =>
    ["analytics", "period", from, to, warehouseId] as const,
  flow: (from: string, to: string, step: string, warehouseId: string | null, productIds: string[] | null) =>
    ["analytics", "flow", from, to, step, warehouseId, productIds] as const,
  warehouses: ["analytics", "warehouses"] as const,
};
