"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenDangNhapThanhEmail } from "@/shared/lib/chuan-hoa";
import { dienGiaiLoi } from "@/shared/lib/errors";

import {
  capNhatNguoiDungSchema,
  datLaiMatKhauSchema,
  taoNguoiDungSchema,
  type CapNhatNguoiDungInput,
  type DatLaiMatKhauInput,
  type TaoNguoiDungInput,
} from "../schemas/nguoi-dung.schema";

/** Kết quả trả về giao diện: lỗi gắn được vào đúng ô nhập nhờ `truong`. */
export type KetQuaHanhDong =
  | { ok: true }
  | { ok: false; thongBao: string; truong?: string };

/** Ban vô thời hạn (100 năm) — Supabase Auth không nhận giá trị "vĩnh viễn". */
const KHOA_VO_THOI_HAN = "876000h";

type PhienQuanLy = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

/**
 * Mọi hành động quản trị đều tự kiểm người gọi bằng `getUser()` + bảng `nguoi_dung`,
 * KHÔNG tin dữ liệu client gửi lên và cũng không tin claim trong JWT (claim có thể
 * cũ hơn bảng — xem D-05).
 */
async function layPhienQuanLy(): Promise<PhienQuanLy | { loi: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { loi: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };

  const { data, error } = await supabase
    .from("nguoi_dung")
    .select("vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { loi: dienGiaiLoi(error).huongXuLy };
  if (!data?.dang_hoat_dong || data.vai_tro !== "quan_ly") {
    return { loi: "Chỉ quản lý được quản trị tài khoản." };
  }

  return { supabase, userId: user.id };
}

/** Giữ ít nhất một quản lý đang hoạt động, nếu không sẽ không ai vào được Cài đặt nữa. */
async function conQuanLyKhac(
  { supabase }: PhienQuanLy,
  truId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("nguoi_dung")
    .select("id", { count: "exact", head: true })
    .eq("vai_tro", "quan_ly")
    .eq("dang_hoat_dong", true)
    .neq("id", truId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

async function docHoSo(phien: PhienQuanLy, id: string) {
  const { data, error } = await phien.supabase
    .from("nguoi_dung")
    .select("id, ho_ten, ten_dang_nhap, vai_tro, dang_hoat_dong, phai_doi_mat_khau")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: kho, error: loiKho } = await phien.supabase
    .from("nguoi_dung_kho")
    .select("kho_id")
    .eq("nguoi_dung_id", id);

  if (loiKho) throw loiKho;

  return { ...data, khoIds: (kho ?? []).map((k) => k.kho_id) };
}

function loiDauTien(issues: { path: PropertyKey[]; message: string }[]): KetQuaHanhDong {
  const dau = issues[0];
  return {
    ok: false,
    thongBao: dau?.message ?? "Dữ liệu không hợp lệ",
    truong: dau?.path?.[0] ? String(dau.path[0]) : undefined,
  };
}

/** Thu hồi phiên: chặn LÀM MỚI token. Token đang cầm hết hạn theo TTL (xem D-05). */
async function thuHoiPhien(nguoiDungId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("thu_hoi_phien_nguoi_dung", {
    p_nguoi_dung_id: nguoiDungId,
  });
  if (error) throw error;
}

export async function taoNguoiDung(input: TaoNguoiDungInput): Promise<KetQuaHanhDong> {
  const phien = await layPhienQuanLy();
  if ("loi" in phien) return { ok: false, thongBao: phien.loi };

  const parsed = taoNguoiDungSchema.safeParse(input);
  if (!parsed.success) return loiDauTien(parsed.error.issues);
  const v = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: taoMoi, error: loiTao } = await admin.auth.admin.createUser({
    email: tenDangNhapThanhEmail(v.tenDangNhap),
    password: v.matKhauTam,
    email_confirm: true,
  });

  if (loiTao || !taoMoi?.user) {
    const trung =
      loiTao?.code === "email_exists" || loiTao?.message?.includes("already been registered");
    return {
      ok: false,
      truong: trung ? "tenDangNhap" : undefined,
      thongBao: trung
        ? "Tên đăng nhập này đã có người dùng. Chọn tên khác."
        : (loiTao ? dienGiaiLoi(loiTao).huongXuLy : "Không tạo được tài khoản."),
    };
  }

  const { error: loiHoSo } = await phien.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: taoMoi.user.id,
    p_ho_ten: v.hoTen,
    p_ten_dang_nhap: v.tenDangNhap,
    p_vai_tro: v.vaiTro,
    p_kho_ids: v.khoIds,
    p_phai_doi_mat_khau: true,
  });

  if (loiHoSo) {
    // Hồ sơ hỏng thì tài khoản Auth vừa tạo thành rác: xóa để lần sau tạo lại được.
    await admin.auth.admin.deleteUser(taoMoi.user.id);
    return { ok: false, thongBao: dienGiaiLoi(loiHoSo).huongXuLy };
  }

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function capNhatNguoiDung(
  input: CapNhatNguoiDungInput,
): Promise<KetQuaHanhDong> {
  const phien = await layPhienQuanLy();
  if ("loi" in phien) return { ok: false, thongBao: phien.loi };

  const parsed = capNhatNguoiDungSchema.safeParse(input);
  if (!parsed.success) return loiDauTien(parsed.error.issues);
  const v = parsed.data;

  const cu = await docHoSo(phien, v.id);
  if (!cu) return { ok: false, thongBao: "Không tìm thấy tài khoản này." };

  const haQuyenQuanLy = cu.vai_tro === "quan_ly" && v.vaiTro !== "quan_ly";
  if (haQuyenQuanLy && !(await conQuanLyKhac(phien, v.id))) {
    return {
      ok: false,
      truong: "vaiTro",
      thongBao: "Phải còn ít nhất một quản lý đang hoạt động.",
    };
  }

  const { error } = await phien.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: v.id,
    p_ho_ten: v.hoTen,
    p_ten_dang_nhap: cu.ten_dang_nhap ?? "",
    p_vai_tro: v.vaiTro,
    p_kho_ids: v.khoIds,
    p_phai_doi_mat_khau: cu.phai_doi_mat_khau,
  });

  if (error) return { ok: false, thongBao: dienGiaiLoi(error).huongXuLy };

  const doiKho =
    cu.khoIds.length !== v.khoIds.length ||
    cu.khoIds.some((k) => !v.khoIds.includes(k));

  if (cu.vai_tro !== v.vaiTro || doiKho) await thuHoiPhien(v.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function doiTrangThaiNguoiDung(input: {
  id: string;
  dangHoatDong: boolean;
}): Promise<KetQuaHanhDong> {
  const phien = await layPhienQuanLy();
  if ("loi" in phien) return { ok: false, thongBao: phien.loi };

  const cu = await docHoSo(phien, input.id);
  if (!cu) return { ok: false, thongBao: "Không tìm thấy tài khoản này." };

  if (!input.dangHoatDong && cu.vai_tro === "quan_ly" && !(await conQuanLyKhac(phien, input.id))) {
    return { ok: false, thongBao: "Phải còn ít nhất một quản lý đang hoạt động." };
  }

  const { error } = await phien.supabase
    .from("nguoi_dung")
    .update({ dang_hoat_dong: input.dangHoatDong })
    .eq("id", input.id);

  if (error) return { ok: false, thongBao: dienGiaiLoi(error).huongXuLy };

  const admin = createSupabaseAdminClient();
  const { error: loiBan } = await admin.auth.admin.updateUserById(input.id, {
    ban_duration: input.dangHoatDong ? "none" : KHOA_VO_THOI_HAN,
  });
  if (loiBan) return { ok: false, thongBao: dienGiaiLoi(loiBan).huongXuLy };

  if (!input.dangHoatDong) await thuHoiPhien(input.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function datLaiMatKhau(
  input: DatLaiMatKhauInput,
): Promise<KetQuaHanhDong> {
  const phien = await layPhienQuanLy();
  if ("loi" in phien) return { ok: false, thongBao: phien.loi };

  const parsed = datLaiMatKhauSchema.safeParse(input);
  if (!parsed.success) return loiDauTien(parsed.error.issues);
  const v = parsed.data;

  const cu = await docHoSo(phien, v.id);
  if (!cu) return { ok: false, thongBao: "Không tìm thấy tài khoản này." };

  const admin = createSupabaseAdminClient();
  const { error: loiMatKhau } = await admin.auth.admin.updateUserById(v.id, {
    password: v.matKhauTam,
  });
  if (loiMatKhau) return { ok: false, truong: "matKhauTam", thongBao: dienGiaiLoi(loiMatKhau).huongXuLy };

  // Mật khẩu tạm chỉ dùng một lần: bật lại cờ để người dùng phải tự đặt mật khẩu riêng.
  const { error } = await phien.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: v.id,
    p_ho_ten: cu.ho_ten,
    p_ten_dang_nhap: cu.ten_dang_nhap ?? "",
    p_vai_tro: cu.vai_tro,
    p_kho_ids: cu.khoIds,
    p_phai_doi_mat_khau: true,
  });
  if (error) return { ok: false, thongBao: dienGiaiLoi(error).huongXuLy };

  await thuHoiPhien(v.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}
