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
 * Kiểm trên tài khoản duy nhất do `npm run seed:users` tạo (Quản lý/Admin): JWT phải
 * mang `vai_tro = quan_ly` và `kho_id` rỗng (Admin xem mọi kho). Claim `kho_id` của
 * nhân viên giới hạn kho được kiểm trong scripts/test-route-permissions.ts.
 *
 * Dùng anon key, mô phỏng đúng luồng của người dùng thật.
 */
import { taoAnonClient, SEED_ADMIN, samplePassword } from "./_supabase-admin";

type Claims = { vai_tro?: string; kho_id?: string[] | string; sub?: string };

function giaiMaPayload(accessToken: string): Claims {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("Access token không đúng định dạng JWT");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
}

async function main() {
  const anon = taoAnonClient();

  const { data, error } = await anon.auth.signInWithPassword({
    email: SEED_ADMIN.email,
    password: samplePassword(),
  });
  if (error || !data.session) {
    console.error(
      `\nKhông đăng nhập được ${SEED_ADMIN.email}: ${error?.message}\n` +
        "Cách xử lý: chạy `npm run seed:users` (cùng SEED_USER_PASSWORD) rồi chạy lại lệnh này.\n",
    );
    process.exit(1);
  }

  const claims = giaiMaPayload(data.session.access_token);
  await anon.auth.signOut();

  const khoIdClaim = claims.kho_id;
  const khoIdMang = Array.isArray(khoIdClaim) ? khoIdClaim : khoIdClaim ? [khoIdClaim] : [];
  const loi: string[] = [];
  if (!claims.vai_tro) {
    loi.push("thiếu vai_tro");
  } else if (claims.vai_tro !== SEED_ADMIN.role) {
    loi.push(`vai_tro sai (nhận ${claims.vai_tro}, cần ${SEED_ADMIN.role})`);
  }
  if (khoIdMang.length > 0) loi.push(`kho_id phải rỗng (nhận ${khoIdMang.join(",")})`);

  console.log("\nClaims trong JWT sau khi đăng nhập thật:\n");
  console.table([
    {
      email: SEED_ADMIN.email,
      vai_tro: claims.vai_tro ?? "—",
      kho_id: khoIdMang.length ? khoIdMang.join("+") : "—",
      ket_qua: loi.length ? `✗ ${loi.join("; ")}` : "✓",
    },
  ]);

  if (loi.length > 0) {
    console.error(
      "\nJWT thiếu hoặc sai claim.\n\n" +
        "Nguyên nhân thường gặp: hook chưa được bật trên cloud.\n" +
        "Cách xử lý: Supabase Dashboard > Authentication > Hooks >\n" +
        "  Customize Access Token (JWT) Claims > chọn public.custom_access_token_hook > Enable.\n" +
        "Bật xong chạy lại lệnh này.\n",
    );
    process.exit(1);
  }

  console.log("\n✓ Hook chạy đúng: JWT mang vai_tro quan_ly.\n");
}

main().catch((e) => {
  console.error("\nverify:hook thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
