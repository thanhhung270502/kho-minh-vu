import { z } from "zod";

/** Form nhân viên phụ trách (0077) — tên viết tắt để chọn nhanh, tên đầy đủ để hiển thị. */
export const staffSchema = z.object({
  shortName: z.string().trim().min(1, "Nhập tên viết tắt").max(30, "Tên viết tắt tối đa 30 ký tự"),
  fullName: z.string().trim().min(1, "Nhập tên đầy đủ"),
  isActive: z.boolean(),
});

export type StaffFormValues = z.infer<typeof staffSchema>;
