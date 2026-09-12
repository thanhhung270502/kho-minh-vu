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
import { taoAdminClient, TAI_KHOAN_MAU, matKhauMau } from "./_supabase-admin";

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

  const ketQua: Array<{ email: string; vaiTro: string; kho: string; trangThai: string }> = [];

  for (const tk of TAI_KHOAN_MAU) {
    let userId: string | undefined;
    let trangThai = "đã tạo";

    const { data: taoMoi, error: loiTao } = await supabase.auth.admin.createUser({
      email: tk.email,
      password: matKhauMau(),
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

    const khoId = tk.maKho ? (khoTheoMa.get(tk.maKho) ?? null) : null;
    if (tk.maKho && !khoId) {
      throw new Error(`Không tìm thấy kho có mã ${tk.maKho}. Chạy npm run db:push trước.`);
    }

    const { error: loiHoSo } = await supabase
      .from("nguoi_dung")
      .upsert({ id: userId, ho_ten: tk.hoTen, vai_tro: tk.vaiTro, kho_id: khoId }, { onConflict: "id" });
    if (loiHoSo) throw loiHoSo;

    ketQua.push({ email: tk.email, vaiTro: tk.vaiTro, kho: tk.maKho ?? "—", trangThai });
  }

  console.log("\nTài khoản mẫu:\n");
  console.table(ketQua);
  console.log(
    `\nMật khẩu: ${matKhauMau()}\n` +
      "Đây là tài khoản DEMO. Đổi mật khẩu hoặc xóa hẳn trước khi go-live.\n" +
      "Bước tiếp theo: npm run verify:hook\n",
  );
}

main().catch((e) => {
  console.error("\nseed:users thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
