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

    const { error: loiHoSo } = await supabase
      .from("nguoi_dung")
      .upsert({ id: userId, ho_ten: tk.fullName, vai_tro: tk.role }, { onConflict: "id" });
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
