/**
 * Tạo tài khoản và chức vụ ban đầu:
 *   - 5 tài khoản DEMO (SAMPLE_ACCOUNTS) — test RLS, verify:hook, test-route-permissions
 *     dựa vào chúng, nên giữ nguyên và giữ đang hoạt động.
 *   - chức vụ "Quản lý kho" (phạm vi văn phòng, mọi quyền trừ Tạo nhân viên).
 *   - 6 tài khoản nhân viên thật (STAFF_ACCOUNTS), bật Duyệt kiểm kê, bắt đổi mật
 *     khẩu ở lần đăng nhập đầu.
 *
 *   npm run seed:users
 *
 * Ghi đè trực tiếp (hệ thống chưa đưa vào dùng): mỗi lần chạy đặt lại mật khẩu,
 * hồ sơ, kho, và quyền của "Quản lý kho" đúng như danh sách dưới đây.
 * Khớp supabase/seed.sql — sửa một bên thì sửa cả bên kia.
 *
 * Dùng Admin API (`auth.admin.createUser`) chứ không insert thẳng vào
 * `auth.users`: insert thẳng không phải API chính thức của GoTrue và dễ vỡ khi
 * Supabase đổi schema. Đây cũng là đường DUY NHẤT dùng được trên cloud —
 * `supabase db push` không chạy `seed.sql`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types";
import { taoAdminClient, SAMPLE_ACCOUNTS, samplePassword } from "./_supabase-admin";

type Admin = SupabaseClient<Database>;
type Quyen =
  | "xem_dashboard" | "nhap_kho" | "tao_don" | "xac_nhan_don" | "hoan_thanh_don"
  | "sua_hoa_don" | "tao_ma_hang" | "tao_nhan_vien" | "kiem_kho";

const MA_CHUC_VU_THEO_VAI_TRO = {
  quan_ly: "QUAN_LY", van_phong: "NHAN_VIEN", thu_kho: "THU_KHO", chi_xem: "CHI_XEM",
} as const;

const QUAN_LY_KHO = {
  ma: "QUAN_LY_KHO",
  ten: "Quản lý kho",
  phamVi: "van_phong" as const,
  quyen: [
    "xem_dashboard", "nhap_kho", "tao_don", "xac_nhan_don", "hoan_thanh_don",
    "sua_hoa_don", "tao_ma_hang", "kiem_kho",
  ] satisfies Quyen[],
};

type SeedAccount = {
  email: string;
  fullName: string;
  maChucVu: string;
  maKho: string[];
  password: string;
  duyetKiemKe: boolean;
  phaiDoiMatKhau: boolean;
  xemLichSuKiotviet: boolean;
};

const STAFF_ACCOUNTS: Array<{ username: string; fullName: string; maChucVu: string }> = [
  { username: "buthikimchi", fullName: "Bùi Thị Kim Chi", maChucVu: "NHAN_VIEN" },
  { username: "chequaydau",  fullName: "Chề Quay Dậu",    maChucVu: "NHAN_VIEN" },
  { username: "huynhvihang", fullName: "Huỳnh Vĩ Hàng",   maChucVu: "QUAN_LY" },
  { username: "minhnhi",     fullName: "Minh Nhi",        maChucVu: "NHAN_VIEN" },
  { username: "ngothanhbuu", fullName: "Ngô Thanh Bửu",   maChucVu: "NHAN_VIEN" },
  { username: "tuvinhan",    fullName: "Từ Vĩnh An",      maChucVu: QUAN_LY_KHO.ma },
];

/**
 * Tài khoản thật không được dùng mật khẩu demo nằm trong repo — bắt buộc khai
 * STAFF_INITIAL_PASSWORD. Người dùng phải đổi ngay lần đăng nhập đầu.
 */
function staffPassword(): string {
  const value = process.env.STAFF_INITIAL_PASSWORD?.trim();
  if (!value) {
    throw new Error(
      "Thiếu STAFF_INITIAL_PASSWORD.\n" +
        "Cách xử lý: khai mật khẩu tạm cho tài khoản nhân viên trong .env.local hoặc ngay trên dòng lệnh,\n" +
        "rồi chạy lại. Nhân viên sẽ bị bắt đổi mật khẩu ở lần đăng nhập đầu.",
    );
  }
  return value;
}

/**
 * Upsert theo mã rồi đặt lại toàn bộ quyền. Chức vụ khác mã nhưng trùng tên
 * "Quản lý kho" (ai đó đổi tên tay) sẽ đụng unique index lower(ten) — báo lỗi rõ.
 */
async function ensureJobTitle(supabase: Admin): Promise<string> {
  const { data, error } = await supabase
    .from("chuc_vu")
    .upsert({ ma: QUAN_LY_KHO.ma, ten: QUAN_LY_KHO.ten, pham_vi: QUAN_LY_KHO.phamVi }, { onConflict: "ma" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Đã có chức vụ khác tên "${QUAN_LY_KHO.ten}" nhưng mã không phải ${QUAN_LY_KHO.ma}.\n` +
          "Cách xử lý: đổi tên hoặc xóa chức vụ đó ở Cài đặt → Chức vụ rồi chạy lại.",
      );
    }
    throw error;
  }

  const { error: loiXoa } = await supabase.from("chuc_vu_quyen").delete().eq("chuc_vu_id", data.id);
  if (loiXoa) throw loiXoa;
  const { error: loiQuyen } = await supabase
    .from("chuc_vu_quyen")
    .insert(QUAN_LY_KHO.quyen.map((quyen) => ({ chuc_vu_id: data.id, quyen })));
  if (loiQuyen) throw loiQuyen;
  return data.id;
}

/** listUsers trả 50 người/trang — phải lật trang, nếu không tài khoản cũ "biến mất". */
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

  const { data: khoList, error: khoErr } = await supabase.from("kho").select("id, ma");
  if (khoErr) throw khoErr;
  if (!khoList?.length) {
    throw new Error(
      "Chưa có kho nào trong database.\n" +
        "Cách xử lý: chạy `npm run db:push` trước để áp migration (0018 tạo kho K1, K2).",
    );
  }
  const khoTheoMa = new Map(khoList.map((k) => [k.ma, k.id]));

  const quanLyKhoId = await ensureJobTitle(supabase);
  const { data: chucVuList, error: loiChucVu } = await supabase.from("chuc_vu").select("id, ma");
  if (loiChucVu) throw loiChucVu;
  const chucVuTheoMa = new Map((chucVuList ?? []).map((c) => [c.ma, c.id]));
  chucVuTheoMa.set(QUAN_LY_KHO.ma, quanLyKhoId);

  const password = staffPassword();
  const accounts: SeedAccount[] = [
    ...SAMPLE_ACCOUNTS.map((tk) => ({
      email: tk.email,
      fullName: tk.fullName,
      maChucVu: MA_CHUC_VU_THEO_VAI_TRO[tk.role],
      maKho: tk.maKho,
      password: samplePassword(),
      // Quản lý demo bật Duyệt KK như ảnh màn Người dùng; demo khác giữ mặc định.
      duyetKiemKe: tk.role === "quan_ly",
      phaiDoiMatKhau: false,
      // Công tắc lịch sử KiotViet của văn phòng (backfill 0063).
      xemLichSuKiotviet: tk.role === "van_phong",
    })),
    ...STAFF_ACCOUNTS.map((tk) => ({
      email: `${tk.username}@khominhvu.local`,
      fullName: tk.fullName,
      maChucVu: tk.maChucVu,
      maKho: [],
      password,
      duyetKiemKe: true,
      phaiDoiMatKhau: true,
      xemLichSuKiotviet: false,
    })),
  ];

  const ketQua: Array<{ email: string; chucVu: string; kho: string; trangThai: string }> = [];

  for (const tk of accounts) {
    let userId: string | undefined;
    let trangThai = "đã tạo";

    const { data: taoMoi, error: loiTao } = await supabase.auth.admin.createUser({
      email: tk.email,
      password: tk.password,
      email_confirm: true,
    });

    if (loiTao) {
      // Đã tồn tại — tra id, đặt lại mật khẩu rồi ghi đè hồ sơ.
      userId = await findUserIdByEmail(supabase, tk.email);
      if (!userId) {
        throw new Error(`Không tạo được và cũng không tìm thấy tài khoản ${tk.email}: ${loiTao.message}`);
      }
      const { error: loiMatKhau } = await supabase.auth.admin.updateUserById(userId, { password: tk.password });
      if (loiMatKhau) throw loiMatKhau;
      trangThai = "đã có, ghi đè";
    } else {
      userId = taoMoi.user.id;
    }

    const warehouseIds: string[] = [];
    for (const ma of tk.maKho) {
      const id = khoTheoMa.get(ma);
      if (!id) {
        throw new Error(`Không tìm thấy kho có mã ${ma}. Chạy npm run db:push trước.`);
      }
      warehouseIds.push(id);
    }

    const chucVuId = chucVuTheoMa.get(tk.maChucVu);
    if (!chucVuId) throw new Error(`Không có chức vụ ${tk.maChucVu}. Chạy migration 0082 trước.`);

    // Tên đăng nhập suy từ email (giống màn đăng nhập) — để NULL thì màn Người dùng hiện "—".
    const { error: loiHoSo } = await supabase.from("nguoi_dung").upsert(
      {
        id: userId,
        ho_ten: tk.fullName,
        chuc_vu_id: chucVuId,
        ten_dang_nhap: tk.email.split("@")[0],
        duyet_kiem_ke: tk.duyetKiemKe,
        phai_doi_mat_khau: tk.phaiDoiMatKhau,
        xem_lich_su_kiotviet: tk.xemLichSuKiotviet,
      },
      { onConflict: "id" },
    );
    if (loiHoSo) throw loiHoSo;

    const { error: loiXoaKho } = await supabase.from("nguoi_dung_kho").delete().eq("nguoi_dung_id", userId);
    if (loiXoaKho) throw loiXoaKho;

    if (warehouseIds.length > 0) {
      const { error: loiThemKho } = await supabase
        .from("nguoi_dung_kho")
        .insert(warehouseIds.map((khoId) => ({ nguoi_dung_id: userId, kho_id: khoId })));
      if (loiThemKho) throw loiThemKho;
    }

    ketQua.push({
      email: tk.email,
      chucVu: tk.maChucVu,
      kho: tk.maKho.length ? tk.maKho.join("+") : "Tất cả",
      trangThai,
    });
  }

  console.log("\nTài khoản:\n");
  console.table(ketQua);
  console.log(
    `\nMật khẩu demo: ${samplePassword()} — đổi hoặc xóa các tài khoản demo trước khi go-live.\n` +
      "Tài khoản nhân viên dùng STAFF_INITIAL_PASSWORD và bị bắt đổi mật khẩu khi đăng nhập lần đầu.\n" +
      "Bước tiếp theo: npm run verify:hook\n",
  );
}

main().catch((e) => {
  console.error("\nseed:users thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
