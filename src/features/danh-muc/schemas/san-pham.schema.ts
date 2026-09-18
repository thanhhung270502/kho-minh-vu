import { z } from "zod";

// KHÔNG dùng `z.coerce.number()`: nó để kiểu đầu vào là `unknown`, làm mọi ô
// `InputNumber` mất kiểu `value`. Ô số của antd đã trả về number|null sẵn.
const soKhongAm = (nhan: string) =>
  z.number({ message: `${nhan} phải là số` }).min(0, `${nhan} không được âm`);

export const sanPhamSchema = z
  .object({
    ma_hang: z
      .string()
      .trim()
      .min(1, "Nhập mã hàng")
      .max(50, "Mã hàng tối đa 50 ký tự")
      .regex(/^\S+$/, "Mã hàng không chứa khoảng trắng"),
    ten_hang: z.string().trim().min(2, "Nhập tên hàng"),
    nhom_hang_id: z.string().uuid().nullable(),
    // ĐVT và công đoạn là HAI trường riêng — đây chính là lỗi dữ liệu số 1 của
    // hệ cũ (KiotViet nhét công đoạn vào ô ĐVT). Cả hai đều bắt buộc.
    dvt_id: z.string({ message: "Chọn đơn vị tính" }).uuid("Chọn đơn vị tính"),
    cong_doan_id: z.string({ message: "Chọn công đoạn" }).uuid("Chọn công đoạn"),
    quy_doi: z.number({ message: "Quy đổi phải là số" }).gt(0, "Quy đổi phải lớn hơn 0"),
    kho_mac_dinh_id: z.string().uuid().nullable(),
    ton_toi_thieu: soKhongAm("Tồn tối thiểu"),
    ton_toi_da: soKhongAm("Tồn tối đa").nullable(),
    gia_ban: soKhongAm("Giá bán"),
    barcode: z
      .string()
      .trim()
      .max(64, "Barcode tối đa 64 ký tự")
      .nullable()
      .transform((v) => v || null),
    ghi_chu: z
      .string()
      .trim()
      .nullable()
      .transform((v) => v || null),
    dang_kinh_doanh: z.boolean(),
  })
  .refine((v) => v.ton_toi_da === null || v.ton_toi_da >= v.ton_toi_thieu, {
    path: ["ton_toi_da"],
    message: "Tồn tối đa phải ≥ tồn tối thiểu",
  });

export type SanPhamForm = z.input<typeof sanPhamSchema>;
export type SanPhamLuu = z.output<typeof sanPhamSchema>;
