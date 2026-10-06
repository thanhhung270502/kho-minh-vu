import { z } from "zod";

import type { Database } from "@/types/database.types";

const emptyToNull = (value: string | undefined) =>
  value && value.trim() ? value.trim() : null;

export const partnerSchema = z
  .object({
  code: z
    .string()
    .trim()
    .min(1, "Nhập mã đối tác")
    .max(32, "Mã tối đa 32 ký tự")
    .regex(/^[A-Za-z0-9._-]+$/, "Mã chỉ gồm chữ không dấu, số và . _ -")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2, "Nhập tên đối tác"),
  kind: z.enum(["NCC", "KHACH", "NOI_BO", "CA_HAI"]),
  phone: z
    .string()
    .trim()
    .max(20, "Số điện thoại tối đa 20 ký tự")
    .regex(/^[0-9 +().-]*$/, "Số điện thoại chỉ gồm số và + ( ) . -")
    .optional()
    .transform(emptyToNull),
  email: z
    .union([z.literal(""), z.string().trim().email("Email không hợp lệ")])
    .optional()
    .transform(emptyToNull),
  address: z.string().trim().optional().transform(emptyToNull),
  region: z.string().trim().optional().transform(emptyToNull),
  taxCode: z.string().trim().max(20).optional().transform(emptyToNull),
  note: z.string().trim().optional().transform(emptyToNull),
  isActive: z.boolean(),
  })
  // Mã NB… là dấu hiệu nội bộ ở mọi màn đơn hàng — loại và mã phải khớp nhau.
  .superRefine((value, ctx) => {
    const internalCode = /^NB\d/i.test(value.code);
    if (value.kind === "NOI_BO" && !internalCode) {
      ctx.addIssue({ code: "custom", path: ["code"], message: "Mã nội bộ bắt đầu bằng NB và một chữ số (vd. NB003)" });
    }
    // Khách mã NB… sẽ hiện là "Nội bộ"; NB002 (Cả hai) có sẵn nên chỉ chặn loại Đối tác.
    if (value.kind === "KHACH" && internalCode) {
      ctx.addIssue({ code: "custom", path: ["code"], message: "Mã NB… dành cho nội bộ — chọn loại Nội bộ hoặc đổi mã khác" });
    }
  });

export type PartnerFormValues = z.input<typeof partnerSchema>;
export type PartnerInput = z.output<typeof partnerSchema>;

type PartnerInsert = Database["public"]["Tables"]["doi_tac"]["Insert"];

/** Ranh giới duy nhất đổi khóa miền sang tên cột `doi_tac`. */
export function toPartnerInsert(input: PartnerInput): PartnerInsert {
  return {
    ma: input.code,
    ten: input.name,
    // "Nội bộ" lưu là KHACH, nhận ra bằng mã NB (xem PartnerFormKind).
    loai: input.kind === "NOI_BO" ? "KHACH" : input.kind,
    dien_thoai: input.phone,
    email: input.email,
    dia_chi: input.address,
    khu_vuc: input.region,
    ma_so_thue: input.taxCode,
    ghi_chu: input.note,
    dang_hoat_dong: input.isActive,
  };
}
