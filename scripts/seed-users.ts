/**
 * Tạo 4 tài khoản mẫu tương ứng 4 vai trò, để test RLS bằng hành vi thật.
 *
 *   npm run seed:users
 *
 * Idempotent: tài khoản đã có thì bỏ qua, chỉ cập nhật vai trò và kho.
 *
 * Dùng Admin API (`auth.admin.createUser`) chứ không insert thẳng vào
 * `auth.users`: insert thẳng không phải API chính thức của GoTrue và dễ vỡ khi
 * Supabase đổi schema. Đây cũng là đường DUY NHẤT dùng được trên cloud —
 * `supabase db push` không chạy `seed.sql`.
 */
import { taoAdminClient, SAMPLE_ACCOUNTS, samplePassword } from "./_supabase-admin";

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

  // Chức vụ mặc định theo vai trò (0082) — seed ghi chức vụ, trigger tự đặt vai_tro.
  const { data: chucVuList, error: loiChucVu } = await supabase.from("chuc_vu").select("id, ma");
  if (loiChucVu) throw loiChucVu;
  const MA_CHUC_VU = { quan_ly: "QUAN_LY", van_phong: "NHAN_VIEN", thu_kho: "THU_KHO", chi_xem: "CHI_XEM" } as const;
  const chucVuTheoMa = new Map((chucVuList ?? []).map((c) => [c.ma, c.id]));

  const ketQua: Array<{ email: string; role: string; kho: string; trangThai: string }> = [];

  // TODO(plan 02-09): bỏ ép kiểu "as never" sau khi `npm run db:types` sinh lại
  // database.types.ts có bảng nguoi_dung_kho (migration 0026).
  const nguoiDungKho = () => supabase.from("nguoi_dung_kho" as never);

  for (const tk of SAMPLE_ACCOUNTS) {
    let userId: string | undefined;
    let trangThai = "đã tạo";

    const { data: taoMoi, error: loiTao } = await supabase.auth.admin.createUser({
      email: tk.email,
      password: samplePassword(),
      email_confirm: true,
    });

    if (loiTao) {
      // Đã tồn tại — tra id để vẫn cập nhật được hồ sơ.
      const { data: ds, error: loiTim } = await supabase.auth.admin.listUsers();
      if (loiTim) throw loiTim;
      userId = ds.users.find((u) => u.email === tk.email)?.id;
      if (!userId) {
        throw new Error(`Không tạo được và cũng không tìm thấy tài khoản ${tk.email}: ${loiTao.message}`);
      }
      trangThai = "đã có, cập nhật hồ sơ";
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

    // Tên đăng nhập suy từ email (giống màn đăng nhập) — để NULL thì màn Người dùng
    // hiện "—". Công tắc lịch sử KiotViet của văn phòng (backfill 0063) chỉ bật khi
    // TẠO MỚI: tài khoản đã có thì giữ nguyên lựa chọn quản lý đã đặt trên cloud.
    const chucVuId = chucVuTheoMa.get(MA_CHUC_VU[tk.role]);
    if (!chucVuId) throw new Error(`Không có chức vụ ${MA_CHUC_VU[tk.role]}. Chạy migration 0082 trước.`);

    const { error: loiHoSo } = await supabase.from("nguoi_dung").upsert(
      {
        id: userId,
        ho_ten: tk.fullName,
        chuc_vu_id: chucVuId,
        ten_dang_nhap: tk.email.split("@")[0],
        ...(taoMoi?.user && tk.role === "van_phong" ? { xem_lich_su_kiotviet: true } : {}),
      },
      { onConflict: "id" },
    );
    if (loiHoSo) throw loiHoSo;

    const { error: loiXoaKho } = await nguoiDungKho().delete().eq("nguoi_dung_id", userId);
    if (loiXoaKho) throw loiXoaKho;

    if (warehouseIds.length > 0) {
      const { error: loiThemKho } = await nguoiDungKho().insert(
        warehouseIds.map((khoId) => ({ nguoi_dung_id: userId, kho_id: khoId })) as never,
      );
      if (loiThemKho) throw loiThemKho;
    }

    ketQua.push({ email: tk.email, role: tk.role, kho: tk.maKho.length ? tk.maKho.join("+") : "—", trangThai });
  }

  console.log("\nTài khoản mẫu:\n");
  console.table(ketQua);
  console.log(
    `\nMật khẩu: ${samplePassword()}\n` +
      "Đây là tài khoản DEMO. Đổi mật khẩu hoặc xóa hẳn trước khi go-live.\n" +
      "Bước tiếp theo: npm run verify:hook\n",
  );
}

main().catch((e) => {
  console.error("\nseed:users thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
