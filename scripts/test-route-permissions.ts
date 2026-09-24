/**
 * Ma trận quyền route × 4 vai trò, kiểm bằng HTTP thật trên phiên thật.
 *
 * Vì sao cần: `src/shared/lib/permissions.ts` chỉ ẩn/hiện nút. Thứ chặn thật 100% nằm ở
 * `requirePermission()` gọi trong từng Server Component `page.tsx` — middleware phiên
 * đăng nhập chỉ lo 401/chuyển hướng về `/dang-nhap`, không kiểm tra vai trò nào cả. Gõ
 * tay URL là cách người dùng (và người tò mò) vượt giao diện — script này gõ hộ, cho cả
 * 4 vai trò.
 *
 * Chạy: `npm run dev` ở một cửa sổ, rồi `npx tsx scripts/test-route-permissions.ts`.
 */
import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";

import { samplePassword } from "./_supabase-admin";

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
  // lỗi page này crash vì gọi hàm client từ server — ma trận cũ thiếu đúng nó.
  { route: "/cai-dat", ky_vong: { quanly: "→/cai-dat/nguoi-dung", vanphong: "→/cai-dat/nhom-hang", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/nhap-kho", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Cùng quyền xem với /nhap-kho — nút "Tạo đơn" ẩn/hiện là trang trí ở client
  // (canCreate), chặn thật nằm ở bốn policy ghi trên don_dat_hang (plan 04-02).
  { route: "/dat-hang", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Cùng quyền xem với /nhap-kho và /dat-hang — nút "Tạo phiếu xuất" ẩn/hiện
  // là trang trí ở client (canCreate), chặn thật ở policy ghi trên chung_tu (0016).
  { route: "/xuat-kho", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Phase 5: phạm vi kho của thủ kho siết trong RPC, không ở route — ai cũng mở được.
  { route: "/ton-kho", ky_vong: AI_CUNG_XEM },
  // Duyệt định mức ghi ton_toi_thieu: cùng nhóm với sửa danh mục (quản lý + văn phòng).
  { route: "/ton-kho/dinh-muc", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  // Nạp tồn tạm đổi tồn của mọi mã — chỉ quản lý (khuôn /cai-dat/nguoi-dung).
  { route: "/ton-kho/nap-tam", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/danh-muc", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  { route: "/doi-tac", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  { route: "/doi-tac/ra-ghi-chu", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/nguoi-dung", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/nhom-hang", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/so-chung-tu", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/api/danh-muc/mau-excel", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "401" } },
  // Mở /dang-nhap khi đã đăng nhập phải quay về page gốc, và `tiep_tuc` trỏ ra
  // ngoài miền thì bị vứt (safeRedirectPath) chứ không được chuyển hướng theo.
  { route: "/dang-nhap?tiep_tuc=//evil.com", ky_vong: { quanly: "goc", vanphong: "goc", thukho1: "goc", chixem: "goc", khach: "200" } },
  // Phase 6: phạm vi kho của thủ kho siết trong RPC (0066), không ở route.
  { route: "/kiem-ke", ky_vong: AI_CUNG_XEM },
  // UUID hợp lệ nhưng không tồn tại — trang render trạng thái rỗng phía
  // client (SessionDetail), page.tsx chỉ notFound() khi CHUỖI không đúng
  // khuôn UUID. Phạm vi kho siết ở RPC, không phải ở route.
  { route: "/kiem-ke/00000000-0000-4000-8000-000000000000", ky_vong: AI_CUNG_XEM },
  // Quyền THEO NGƯỜI (D-13), không theo PERMISSION_MATRIX — kỳ vọng của
  // vanphong phụ thuộc công tắc xem_lich_su_kiotviet trong database (backfill
  // 0063). Nếu quản lý tắt công tắc của tài khoản mẫu, dòng này đổi "quyen".
  { route: "/lich-su-kiotviet", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
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
    password: samplePassword(),
  });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);

  return [...kho].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
}

/** Lấy một id đơn đặt hàng có thật để kiểm route chi tiết `/dat-hang/[id]`. */
async function layIdDon(): Promise<string | null> {
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
    password: samplePassword(),
  });
  if (error) return null;

  const { data } = await sb.rpc("danh_sach_don", {
    p_trang: 1,
    p_kich_thuoc: 1,
  });
  return data?.[0]?.id ?? null;
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
    password: samplePassword(),
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

/** Lấy một id phiếu xuất có thật để kiểm route chi tiết `/xuat-kho/[id]`. */
async function layIdPhieuXuat(): Promise<string | null> {
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
    password: samplePassword(),
  });
  if (error) return null;

  const { data } = await sb.rpc("danh_sach_chung_tu", {
    p_loai_ct: "XUAT",
    p_trang: 1,
    p_kich_thuoc: 1,
  });
  return data?.[0]?.id ?? null;
}

/** Lấy một id phiếu trả có thật để kiểm route chi tiết `/tra-hang/[id]` (plan 04-14). */
async function layIdPhieuTra(): Promise<string | null> {
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
    password: samplePassword(),
  });
  if (error) return null;

  // TRA_NCC hoặc TRA_KHACH đều được — route không phân biệt, chỉ cần MỘT
  // phiếu trả có thật (bất kỳ loại nào) để kiểm ma trận quyền.
  for (const loai of ["TRA_NCC", "TRA_KHACH"] as const) {
    const { data } = await sb.rpc("danh_sach_chung_tu", {
      p_loai_ct: loai,
      p_trang: 1,
      p_kich_thuoc: 1,
    });
    if (data?.[0]?.id) return data[0].id;
  }
  return null;
}

/** Lấy một id phiên kiểm kê có thật để kiểm route chi tiết `/kiem-ke/[id]`. */
async function layIdPhienKiemKe(): Promise<string | null> {
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
    password: samplePassword(),
  });
  if (error) return null;

  const { data } = await sb.rpc("danh_sach_phien_kiem_ke", {
    p_trang: 1,
    p_kich_thuoc: 1,
  });
  return data?.[0]?.id ?? null;
}

/**
 * `/api/ton-kho/nap-tam` chỉ có POST — ma trận gửi GET nên sẽ nhận 405 cho mọi vai trò,
 * không nói gì về quyền. Gửi POST với FormData RỖNG: quản lý qua được cửa quyền và
 * dừng ở "Chưa chọn file" (400) — không bao giờ chạm tới RPC, không ghi gì.
 */
const NAP_TAM_POST: Record<VaiTroTest, string> = {
  quanly: "400",
  vanphong: "403",
  thukho1: "403",
  chixem: "403",
  khach: "401",
};

async function kiemNapTamPost(
  cookie: Record<VaiTroTest, string>,
): Promise<{ tong: number; lech: string[] }> {
  const lech: string[] = [];
  const role = Object.keys(NAP_TAM_POST) as VaiTroTest[];
  for (const vt of role) {
    const res = await fetch(`${BASE_URL}/api/ton-kho/nap-tam`, {
      method: "POST",
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      body: new FormData(),
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== NAP_TAM_POST[vt]) {
      lech.push(`${"POST /api/ton-kho/nap-tam".padEnd(34)} ${vt.padEnd(9)} mong ${NAP_TAM_POST[vt]}, thực ${thuc}`);
    }
  }
  return { tong: role.length, lech };
}

/**
 * Hai endpoint Excel của kiểm kê chỉ có GET (mẫu) / POST (nạp) — ma trận
 * thường (`doMot`, dùng GET) không nói được gì về quyền của route POST, và
 * GET không tham số của route mẫu không khớp kiểu `KyVong` hiện có ("200"
 * hay "quyen"/"dangnhap" đều sai — route trả JSON lỗi, không redirect).
 * Theo khuôn `kiemNapTamPost`: gọi trực tiếp bằng `fetch`, so mã trạng thái.
 */
async function kiemKiemKeExcel(
  cookie: Record<VaiTroTest, string>,
): Promise<{ tong: number; lech: string[] }> {
  const lech: string[] = [];
  let tong = 0;
  const role = Object.keys(cookie) as VaiTroTest[];

  // GET /api/kiem-ke/mau-excel không tham số → thiếu `phien` hợp lệ, 400 cho
  // mọi vai trò đã đăng nhập; khách chưa đăng nhập dừng ở 401 trước khi kịp
  // đọc tham số.
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/api/kiem-ke/mau-excel`, {
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      redirect: "manual",
    });
    const mong = vt === "khach" ? "401" : "400";
    const thuc = String(res.status);
    if (thuc !== mong) {
      lech.push(`${"GET /api/kiem-ke/mau-excel".padEnd(34)} ${vt.padEnd(9)} mong ${mong}, thực ${thuc}`);
    }
  }

  // POST /api/kiem-ke/nhap-excel với FormData rỗng → khách 401 (chưa đăng
  // nhập), chi_xem 403 (vai trò không nhập số đếm được — chặn TRƯỚC khi đọc
  // form), ba vai trò còn lại qua được cửa quyền rồi dừng ở 400 (thiếu
  // `phien`/file hợp lệ) — không bao giờ chạm RPC, không ghi gì.
  const mongPost: Record<VaiTroTest, string> = {
    quanly: "400",
    vanphong: "400",
    thukho1: "400",
    chixem: "403",
    khach: "401",
  };
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/api/kiem-ke/nhap-excel`, {
      method: "POST",
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      body: new FormData(),
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== mongPost[vt]) {
      lech.push(`${"POST /api/kiem-ke/nhap-excel".padEnd(34)} ${vt.padEnd(9)} mong ${mongPost[vt]}, thực ${thuc}`);
    }
  }

  return { tong, lech };
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

  const idDon = await layIdDon();
  if (idDon) {
    // /dat-hang/[id]/in cùng quyền xem: T-04-61 chấp nhận thu_kho/chi_xem mở
    // thẳng tờ đi lấy hàng, route vẫn chặn khách chưa đăng nhập.
    MA_TRAN.push(
      { route: `/dat-hang/${idDon}`, ky_vong: AI_CUNG_XEM },
      { route: `/dat-hang/${idDon}/in`, ky_vong: AI_CUNG_XEM },
    );
  } else {
    console.warn("⚠ chưa có đơn đặt hàng nào — bỏ qua route /dat-hang/[id] và /in");
  }

  const idPhieuXuat = await layIdPhieuXuat();
  if (idPhieuXuat) {
    // /in cùng quyền xem với trang chi tiết — bẫy 12, plan 04-14.
    MA_TRAN.push(
      { route: `/xuat-kho/${idPhieuXuat}`, ky_vong: AI_CUNG_XEM },
      { route: `/xuat-kho/${idPhieuXuat}/in`, ky_vong: AI_CUNG_XEM },
    );
  } else {
    console.warn("⚠ chưa có phiếu xuất nào — bỏ qua route /xuat-kho/[id] và /in");
  }

  const idPhieuTra = await layIdPhieuTra();
  if (idPhieuTra) {
    // Bẫy 12 (04-14-PLAN.md): route DUY NHẤT dạng này, không có màn danh
    // sách /tra-hang — vẫn phải có dòng riêng trong ma trận, không đợi 04-15.
    MA_TRAN.push({ route: `/tra-hang/${idPhieuTra}`, ky_vong: AI_CUNG_XEM });
  } else {
    console.warn("⚠ chưa có phiếu trả nào — bỏ qua route /tra-hang/[id]");
  }

  const idPhienKiemKe = await layIdPhienKiemKe();
  if (idPhienKiemKe) {
    MA_TRAN.push({ route: `/kiem-ke/${idPhienKiemKe}`, ky_vong: AI_CUNG_XEM });
  } else {
    console.warn("⚠ chưa có phiên kiểm kê nào — chỉ kiểm route /kiem-ke/[id] bằng uuid không tồn tại");
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

  const napTam = await kiemNapTamPost(cookie);
  tong += napTam.tong;
  lech.push(...napTam.lech);

  const kiemKe = await kiemKiemKeExcel(cookie);
  tong += kiemKe.tong;
  lech.push(...kiemKe.lech);

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
