/**
 * Xác nhận custom_access_token_hook thật sự chạy khi đăng nhập.
 *
 *   npm run verify:hook
 *
 * VÌ SAO SCRIPT NÀY BẮT BUỘC TỒN TẠI:
 * pgTAP đặt thẳng `request.jwt.claims` nên BỎ QUA HOÀN TOÀN hook. Một bộ test
 * pgTAP xanh KHÔNG chứng minh hook chạy. Nếu hook chưa được bật trên Dashboard,
 * ứng dụng thật sẽ nhận JWT không có `vai_tro` — RLS từ chối mọi thứ, hoặc tệ
 * hơn, nếu policy viết lỏng thì cho qua mọi thứ.
 *
 * Dùng anon key, mô phỏng đúng luồng của người dùng thật.
 */
import { taoAnonClient, taoAdminClient, TAI_KHOAN_MAU, matKhauMau } from "./_supabase-admin";

type Claims = { vai_tro?: string; kho_id?: string[] | string; sub?: string };

function giaiMaPayload(accessToken: string): Claims {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("Access token không đúng định dạng JWT");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
}

async function main() {
  const anon = taoAnonClient();
  const admin = taoAdminClient();

  const { data: khoList } = await admin.from("kho").select("id, ma");
  const maTheoKhoId = new Map((khoList ?? []).map((k) => [k.id, k.ma]));

  const dong: Array<{ email: string; vai_tro: string; kho_id: string; ket_qua: string }> = [];
  let hong = 0;

  for (const tk of TAI_KHOAN_MAU) {
    const { data, error } = await anon.auth.signInWithPassword({
      email: tk.email,
      password: matKhauMau(),
    });

    if (error || !data.session) {
      dong.push({ email: tk.email, vai_tro: "—", kho_id: "—", ket_qua: `✗ đăng nhập lỗi: ${error?.message}` });
      hong++;
      continue;
    }

    const claims = giaiMaPayload(data.session.access_token);
    const loi: string[] = [];

    if (!claims.vai_tro) {
      loi.push("thiếu vai_tro");
    } else if (claims.vai_tro !== tk.vaiTro) {
      loi.push(`vai_tro sai (nhận ${claims.vai_tro}, cần ${tk.vaiTro})`);
    }

    const khoIdClaim = claims.kho_id;
    const khoIdMang = Array.isArray(khoIdClaim) ? khoIdClaim : khoIdClaim ? [khoIdClaim] : [];
    const maTuClaim = khoIdMang.map((id) => maTheoKhoId.get(id) ?? id).sort();
    const maMongDoi = [...tk.maKho].sort();

    if (tk.maKho.length > 0) {
      if (!Array.isArray(khoIdClaim)) {
        loi.push(`kho_id phải là mảng (nhận ${khoIdClaim ? "chuỗi" : "vắng mặt"})`);
      } else if (JSON.stringify(maTuClaim) !== JSON.stringify(maMongDoi)) {
        loi.push(`kho_id sai (nhận ${maTuClaim.join(",") || "—"}, cần ${maMongDoi.join(",")})`);
      }
    } else if (khoIdMang.length > 0) {
      loi.push(`kho_id phải rỗng (nhận ${maTuClaim.join(",")})`);
    }

    if (loi.length) hong++;
    dong.push({
      email: tk.email,
      vai_tro: claims.vai_tro ?? "—",
      kho_id: maTuClaim.length ? maTuClaim.join("+") : "—",
      ket_qua: loi.length ? `✗ ${loi.join("; ")}` : "✓",
    });

    await anon.auth.signOut();
  }

  console.log("\nClaims trong JWT sau khi đăng nhập thật:\n");
  console.table(dong);

  if (hong > 0) {
    console.error(
      `\n${hong}/${TAI_KHOAN_MAU.length} tài khoản thiếu claim.\n\n` +
        "Nguyên nhân thường gặp: hook chưa được bật trên cloud.\n" +
        "Cách xử lý: Supabase Dashboard > Authentication > Hooks >\n" +
        "  Customize Access Token (JWT) Claims > chọn public.custom_access_token_hook > Enable.\n" +
        "Bật xong chạy lại lệnh này.\n",
    );
    process.exit(1);
  }

  console.log("\n✓ Hook chạy đúng: mọi tài khoản đều nhận được vai_tro (và kho_id nếu có).\n");
}

main().catch((e) => {
  console.error("\nverify:hook thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
