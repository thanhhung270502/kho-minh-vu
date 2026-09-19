/**
 * Ma trận quyền route × 4 vai trò, kiểm bằng HTTP thật trên phiên thật.
 *
 * Vì sao cần: `src/shared/lib/permissions.ts` chỉ ẩn/hiện nút. Thứ chặn thật là
 * `requirePermission()` trong Server Component và `proxy.ts`. Gõ tay URL là cách người
 * dùng (và người tò mò) vượt giao diện — script này gõ hộ, cho cả 4 vai trò.
 *
 * Chạy: `npm run dev` ở một cửa sổ, rồi `npx tsx scripts/kiem-tra-quyen-route.ts`.
 */
import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";

import { matKhauMau } from "./_supabase-admin";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

type VaiTroTest = "quanly" | "vanphong" | "thukho1" | "chixem" | "khach";

/** "200" = tải được; "quyen" = bị đẩy sang /khong-du-quyen; "dangnhap" = về đăng nhập; "401" = JSON 401. */
type KyVong = "200" | "quyen" | "dangnhap" | "401" | "goc" | `→${string}`;

type Dong = { route: string; ky_vong: Record<VaiTroTest, KyVong> };

/** Mọi vai trò xem được, khách bị đẩy về đăng nhập. */
const AI_CUNG_XEM: Record<VaiTroTest, KyVong> = {
  quanly: "200",
  vanphong: "200",
  thukho1: "200",
  chixem: "200",
  khach: "dangnhap",
};

const MA_TRAN: Dong[] = [
  { route: "/", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // /cai-dat chỉ redirect sang tab đầu tiên theo quyền. UAT Phase 2 bắt được
  // lỗi trang này crash vì gọi hàm client từ server — ma trận cũ thiếu đúng nó.
  { route: "/cai-dat", ky_vong: { quanly: "→/cai-dat/nguoi-dung", vanphong: "→/cai-dat/nhom-hang", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/nhap-kho", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  { route: "/danh-muc", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  { route: "/doi-tac", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  { route: "/doi-tac/ra-ghi-chu", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/nguoi-dung", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/nhom-hang", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/so-chung-tu", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/api/danh-muc/mau-excel", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "401" } },
  // Mở /dang-nhap khi đã đăng nhập phải quay về trang gốc, và `tiep_tuc` trỏ ra
  // ngoài miền thì bị vứt (safeRedirectPath) chứ không được chuyển hướng theo.
  { route: "/dang-nhap?tiep_tuc=//evil.com", ky_vong: { quanly: "goc", vanphong: "goc", thukho1: "goc", chixem: "goc", khach: "200" } },
];

const TAI_KHOAN: Record<Exclude<VaiTroTest, "khach">, string> = {
  quanly: "quanly@khominhvu.local",
  vanphong: "vanphong@khominhvu.local",
  thukho1: "thukho1@khominhvu.local",
  chixem: "chixem@khominhvu.local",
};

/**
 * Lấy cookie phiên đúng định dạng mà app đọc: dùng chính `createServerClient`
 * của @supabase/ssr với kho cookie trong RAM, thay vì tự ghép chuỗi token.
 */
async function layCookie(email: string): Promise<string> {
  const kho = new Map<string, string>();

  const sb = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
    {
      cookies: {
        getAll: () => [...kho].map(([name, value]) => ({ name, value })),
        setAll: (ds) => ds.forEach((c) => kho.set(c.name, c.value)),
      },
    },
  );

  const { error } = await sb.auth.signInWithPassword({
    email,
    password: matKhauMau(),
  });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);

  return [...kho].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
}

/** Lấy một id phiếu nhập có thật để kiểm route chi tiết. */
async function layIdPhieuNhap(): Promise<string | null> {
  const kho = new Map<string, string>();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => [...kho].map(([name, value]) => ({ name, value })),
        setAll: (ds) => ds.forEach((c) => kho.set(c.name, c.value)),
      },
    },
  );

  const { error } = await sb.auth.signInWithPassword({
    email: TAI_KHOAN.quanly,
    password: matKhauMau(),
  });
  if (error) return null;

  const { data } = await sb.rpc("danh_sach_chung_tu", {
    p_loai_ct: "NHAP",
    p_trang: 1,
    p_kich_thuoc: 1,
  });
  return data?.[0]?.id ?? null;
}

async function doMot(route: string, cookie: string): Promise<KyVong | string> {
  const res = await fetch(`${BASE_URL}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });

  if (res.status === 401) return "401";

  if (res.status >= 300 && res.status < 400) {
    const dich = res.headers.get("location") ?? "";
    if (dich.includes("/dang-nhap")) return "dangnhap";
    if (dich.includes("/khong-du-quyen")) return "quyen";
    const duong = new URL(dich, BASE_URL).pathname;
    return duong === "/" ? "goc" : `→${duong}`;
  }

  if (res.status === 200) {
    // `redirect()` trong Server Component có thể trả 200 kèm payload RSC thay vì
    // header Location — khi đó đích nằm trong thân phản hồi.
    const body = await res.text();
    if (body.includes("/khong-du-quyen")) return "quyen";
    return "200";
  }

  return `HTTP ${res.status}`;
}

async function main() {
  try {
    await fetch(BASE_URL, { redirect: "manual" });
  } catch {
    console.error(
      `Không kết nối được ${BASE_URL}.\nMở một cửa sổ khác chạy \`npm run dev\` rồi chạy lại script này.`,
    );
    process.exit(1);
  }

  const cookie: Record<VaiTroTest, string> = {
    quanly: await layCookie(TAI_KHOAN.quanly),
    vanphong: await layCookie(TAI_KHOAN.vanphong),
    thukho1: await layCookie(TAI_KHOAN.thukho1),
    chixem: await layCookie(TAI_KHOAN.chixem),
    khach: "",
  };

  // Route chi tiết cần id THẬT — không hard-code uuid. Không có phiếu nào thì
  // bỏ qua hai dòng đó và nói rõ, thay vì giả vờ đã kiểm.
  const idPhieu = await layIdPhieuNhap();
  if (idPhieu) {
    MA_TRAN.push(
      { route: `/nhap-kho/${idPhieu}`, ky_vong: AI_CUNG_XEM },
      { route: `/nhap-kho/${idPhieu}/in`, ky_vong: AI_CUNG_XEM },
    );
  } else {
    console.warn("⚠ chưa có phiếu nhập nào — bỏ qua 2 route chi tiết");
  }

  const role = Object.keys(cookie) as VaiTroTest[];
  const lech: string[] = [];
  let tong = 0;

  for (const dong of MA_TRAN) {
    for (const vt of role) {
      tong++;
      const thuc = await doMot(dong.route, cookie[vt]);
      const mong = dong.ky_vong[vt];
      if (thuc !== mong) {
        lech.push(`${dong.route.padEnd(34)} ${vt.padEnd(9)} mong ${mong}, thực ${thuc}`);
      }
    }
  }

  if (lech.length > 0) {
    console.error(`✗ quyền route: ${lech.length}/${tong} ô LỆCH\n`);
    for (const l of lech) console.error("  " + l);
    process.exit(1);
  }

  console.log(`✓ quyền route: ${tong}/${tong} ô đúng`);
}

void main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});
