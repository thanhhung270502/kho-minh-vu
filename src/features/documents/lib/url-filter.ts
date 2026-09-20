import { z } from "zod";

const uuidSchema = z.string().uuid();

/** Định dạng ngày trên URL — luôn `YYYY-MM-DD`. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc uuid từ query string; trả `null` nếu thiếu hoặc sai định dạng. */
export function readUuid(value: string | null): string | null {
  return value && uuidSchema.safeParse(value).success ? value : null;
}

/** Đọc ngày `YYYY-MM-DD` từ query string; trả `null` nếu thiếu hoặc sai định dạng. */
export function readDate(value: string | null): string | null {
  return value && DATE_PATTERN.test(value) ? value : null;
}
