/**
 * Tạo (hoặc đặt lại) MỘT tài khoản Quản lý/Admin: quanly@khominhvu.local.
 *
 *   npm run seed:users
 *
 * Từ 0117 quyền đi theo từng người (nguoi_dung_quyen) và chỉ còn Quản lý/Admin là
 * "chức vụ" thật — luôn đủ mọi quyền, không cần dòng quyền nào. Các tài khoản khác
 * do Admin tự tạo và tích quyền ở Cài đặt → Người dùng.
 *
 * Ghi đè trực tiếp: mỗi lần chạy đặt lại mật khẩu và hồ sơ của tài khoản này.
 * Không đụng tới tài khoản nào khác. Khớp supabase/seed.sql — sửa một bên thì sửa cả bên kia.
 *
 * Dùng Admin API (`auth.admin.createUser`) chứ không insert thẳng vào
 * `auth.users`: insert thẳng không phải API chính thức của GoTrue và dễ vỡ khi
 * Supabase đổi schema. Đây cũng là đường DUY NHẤT dùng được trên cloud —
 * `supabase db push` không chạy `seed.sql`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types";
import { taoAdminClient, samplePassword, SEED_ADMIN } from "./_supabase-admin";

type Admin = SupabaseClient<Database>;

/** listUsers trả theo trang — phải lật trang, nếu không tài khoản cũ "biến mất". */
async function findUserIdByEmail(supabase: Admin, email: string): Promise<string | undefined> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) return undefined;
  }
}

async function main() {
  const supabase = taoAdminClient();
  const password = samplePassword();

  const { data: chucVu, error: loiChucVu } = await supabase
    .from("chuc_vu")
    .select("id")
    .eq("ma", SEED_ADMIN.maChucVu)
    .maybeSingle();
  if (loiChucVu) throw loiChucVu;
  if (!chucVu) {
    throw new Error(
      `Không có chức vụ ${SEED_ADMIN.maChucVu}.\n` +
        "Cách xử lý: chạy `npm run db:push` trước để áp migration (0082 tạo chức vụ mặc định).",
    );
  }

  let userId: string | undefined;
  let trangThai = "đã tạo";

  const { data: taoMoi, error: loiTao } = await supabase.auth.admin.createUser({
    email: SEED_ADMIN.email,
    password,
    email_confirm: true,
  });

  if (loiTao) {
    // Đã tồn tại — tra id, đặt lại mật khẩu rồi ghi đè hồ sơ.
    userId = await findUserIdByEmail(supabase, SEED_ADMIN.email);
    if (!userId) {
      throw new Error(`Không tạo được và cũng không tìm thấy tài khoản ${SEED_ADMIN.email}: ${loiTao.message}`);
    }
    const { error: loiMatKhau } = await supabase.auth.admin.updateUserById(userId, { password });
    if (loiMatKhau) throw loiMatKhau;
    trangThai = "đã có, ghi đè";
  } else {
    userId = taoMoi.user.id;
  }

  // Ghi chức vụ, trigger dong_bo_vai_tro_chuc_vu (0082) tự đặt vai_tro = quan_ly.
  // Tên đăng nhập suy từ email (giống màn đăng nhập) — để NULL thì màn Người dùng hiện "—".
  const { error: loiHoSo } = await supabase.from("nguoi_dung").upsert(
    {
      id: userId,
      ho_ten: SEED_ADMIN.fullName,
      chuc_vu_id: chucVu.id,
      ten_dang_nhap: SEED_ADMIN.email.split("@")[0],
      dang_hoat_dong: true,
      duyet_kiem_ke: true,
      phai_doi_mat_khau: false,
      xem_lich_su_kiotviet: false,
    },
    { onConflict: "id" },
  );
  if (loiHoSo) throw loiHoSo;

  // Admin xem mọi kho và luôn đủ quyền — dọn gán kho / quyền lẻ còn sót từ lần seed cũ.
  const { error: loiKho } = await supabase.from("nguoi_dung_kho").delete().eq("nguoi_dung_id", userId);
  if (loiKho) throw loiKho;
  const { error: loiQuyen } = await supabase.from("nguoi_dung_quyen").delete().eq("nguoi_dung_id", userId);
  if (loiQuyen) throw loiQuyen;

  console.log("\nTài khoản:\n");
  console.table([{ email: SEED_ADMIN.email, chucVu: "Quản lý/Admin", kho: "Tất cả", trangThai }]);
  console.log(
    `\nMật khẩu: ${password} (SEED_USER_PASSWORD) — đổi ngay sau khi đăng nhập trên môi trường thật.\n` +
      "Bước tiếp theo: npm run verify:hook\n",
  );
}

main().catch((e) => {
  console.error("\nseed:users thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
