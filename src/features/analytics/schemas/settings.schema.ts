import { z } from "zod";

const days = (label: string) =>
  z.number({ message: `Nhập ${label}` }).int(`${label} là số ngày nguyên`).min(1, `${label} tối thiểu 1`).max(365, `${label} tối đa 365`);

/** Khớp CHECK của cau_hinh_phan_tich (0079): 1..365, vàng > đỏ. */
export const settingsSchema = z
  .object({
    redDays: days("Ngưỡng đỏ"),
    yellowDays: days("Ngưỡng vàng"),
    coverDays: days("Số ngày dự trữ"),
  })
  .refine((v) => v.yellowDays > v.redDays, {
    path: ["yellowDays"],
    message: "Ngưỡng vàng phải lớn hơn ngưỡng đỏ",
  });

export type SettingsFormValues = z.infer<typeof settingsSchema>;
