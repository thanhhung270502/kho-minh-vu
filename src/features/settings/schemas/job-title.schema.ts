import { z } from "zod";

import { removeDiacritics } from "@/shared/lib/text";

import { ROLES } from "./user.schema";

export const jobTitleSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên chức vụ").max(50, "Tên tối đa 50 ký tự"),
  scope: z.enum(ROLES, { message: "Chọn phạm vi" }),
});

export type JobTitleFormValues = z.input<typeof jobTitleSchema>;

/** Mã chức vụ tự sinh từ tên: "Kế toán kho" → "KE_TOAN_KHO". Người dùng không phải gõ mã. */
export function titleCodeFromName(name: string): string {
  return removeDiacritics(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
