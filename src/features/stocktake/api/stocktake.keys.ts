import type { Database } from "@/types/database.types";

type ListArgs = Database["public"]["Functions"]["danh_sach_phien_kiem_ke"]["Args"];

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const stocktakeKeys = {
  all: ["stocktake"] as const,
  sessions: (args?: Partial<ListArgs>) =>
    ["stocktake", "sessions", args ?? {}] as const,
  session: (id: string) => ["stocktake", "session", id] as const,
  sheet: (sessionId: string, categoryId?: string) =>
    ["stocktake", "sheet", sessionId, categoryId ?? null] as const,
  lookups: ["stocktake", "lookups"] as const,
};
