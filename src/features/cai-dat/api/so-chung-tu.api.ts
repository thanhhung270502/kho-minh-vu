import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LoaiCt = Database["public"]["Enums"]["loai_ct"];
export type DongCauHinhSoCt =
  Database["public"]["Functions"]["danh_sach_cau_hinh_so_ct"]["Returns"][number];

/** Nhãn hiển thị: loại + nguồn (nguồn rỗng = dòng gốc của loại). */
export function nhanCauHinh(loai: LoaiCt, nguon: string): string {
  return nguon === "NHA_MAY" ? `${NHAN_LOAI_CT[loai]} · nhà máy` : NHAN_LOAI_CT[loai];
}

export const NHAN_LOAI_CT: Record<LoaiCt, string> = {
  NHAP: "Phiếu nhập",
  XUAT: "Phiếu xuất",
  TRA_NCC: "Trả hàng NCC",
  TRA_KHACH: "Khách trả hàng",
  CHUYEN_KHO: "Chuyển kho",
  KIEM_KE: "Kiểm kê",
  DIEU_CHINH: "Điều chỉnh",
};

export async function layCauHinhSoCt(): Promise<DongCauHinhSoCt[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_cau_hinh_so_ct");
  if (error) throw error;
  return data ?? [];
}

export async function luuCauHinhSoCt(
  loai: LoaiCt,
  nguon: string,
  v: { tien_to: string; so_chu_so: number },
): Promise<void> {
  // Không có policy khớp thì PostgREST trả 0 dòng chứ không báo lỗi — đếm để biết.
  // PHẢI lọc cả `nguon`: từ 0043 một loại có thể có nhiều dòng (NHAP có thêm
  // dòng nhà máy), lọc thiếu là sửa nhầm cả hai và vi phạm unique tiền tố.
  const { error, count } = await getSupabaseBrowserClient()
    .from("cau_hinh_so_ct")
    .update(v, { count: "exact" })
    .eq("loai_ct", loai)
    .eq("nguon", nguon);

  if (error) throw error;
  if (!count) {
    throw new Error("Không lưu được — chỉ quản lý sửa được quy tắc đánh số.");
  }
}

/** Cùng công thức với `sinh_so_ct` ở database, để ví dụ đổi ngay lúc gõ. */
export function viDuSoKeTiep(tienTo: string, soChuSo: number, soHienTai: number): string {
  const nam = String(new Date().getFullYear() % 100).padStart(2, "0");
  return `${tienTo}${nam}-${String(soHienTai + 1).padStart(soChuSo, "0")}`;
}
