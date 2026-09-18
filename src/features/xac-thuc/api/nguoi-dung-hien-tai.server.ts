import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { coQuyen, type Quyen, type VaiTro } from "@/shared/lib/quyen";

export type NguoiDungHienTai = {
  id: string;
  hoTen: string;
  vaiTro: VaiTro;
  /** Mật khẩu hiện tại là mật khẩu tạm do quản lý cấp — phải đổi trước khi dùng app (D-03). */
  phaiDoiMatKhau: boolean;
};

/** Đọc vai trò từ BẢNG (không từ claim) để giao diện khớp RLS ngay sau khi quản lý đổi quyền. */
export async function layNguoiDungHienTai(): Promise<NguoiDungHienTai | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("nguoi_dung")
    .select("id, ho_ten, vai_tro, dang_hoat_dong, phai_doi_mat_khau")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.dang_hoat_dong) return null;

  return {
    id: data.id,
    hoTen: data.ho_ten,
    vaiTro: data.vai_tro,
    phaiDoiMatKhau: data.phai_doi_mat_khau,
  };
}

export async function yeuCauQuyen(quyen: Quyen): Promise<NguoiDungHienTai> {
  const nd = await layNguoiDungHienTai();

  if (!nd) redirect("/dang-nhap");
  if (!coQuyen(nd.vaiTro, quyen)) redirect("/khong-du-quyen");

  return nd;
}
