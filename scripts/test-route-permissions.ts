/**
 * Ma trận quyền route × 4 vai trò (= 4 chức vụ mặc định), kiểm bằng HTTP thật
 * trên phiên thật; cuối file bật/tắt quyền chức vụ và kiểm lại (Phase 16).
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

import type { BusinessPermission } from "../src/shared/lib/permissions";
import { samplePassword, taoAdminClient } from "./_supabase-admin";

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

/** Mọi vai trò, kể cả khách, đều nhận cùng một chuyển hướng (redirect ở next.config.ts). */
const ALL = (k: KyVong): Record<VaiTroTest, KyVong> => ({
  quanly: k,
  vanphong: k,
  thukho1: k,
  chixem: k,
  khach: k,
});

const MA_TRAN: Dong[] = [
  // Phase 7 (D-11): chỉ quản lý xem tổng quan, vai trò khác chuyển sang màn làm việc chính — không phải /khong-du-quyen.
  { route: "/", ky_vong: { quanly: "200", vanphong: "→/duyet-don", thukho1: "→/danh-muc", chixem: "→/danh-muc", khach: "dangnhap" } },
  // /cai-dat chỉ redirect sang tab đầu tiên theo quyền. UAT Phase 2 bắt được
  // lỗi page này crash vì gọi hàm client từ server — ma trận cũ thiếu đúng nó.
  { route: "/cai-dat", ky_vong: { quanly: "→/cai-dat/nguoi-dung", vanphong: "→/cai-dat/nhan-vien-phu-trach", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/nhap-hang", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Cùng quyền xem với /nhap-hang — nút "Tạo đơn" ẩn/hiện là trang trí ở client
  // (canCreate), chặn thật nằm ở bốn policy ghi trên don_dat_hang (plan 04-02).
  { route: "/don-dat", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Phase 12 (DON-01): bấm Tạo đơn vào thẳng trang tạo đơn — cùng quyền tạo
  // đơn của RLS (quản lý + văn phòng).
  { route: "/don-dat/moi", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  // Cùng quyền xem với /nhap-hang và /don-dat — nút "Tạo hóa đơn" ẩn/hiện
  // là trang trí ở client (canCreate), chặn thật ở policy ghi trên chung_tu (0016).
  { route: "/duyet-don", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Phase 17 (TEN-02): link cũ — redirect next.config chạy TRƯỚC proxy nên khách
  // cũng nhận chuyển hướng; /xuat-kho đi thẳng, không qua /hoa-don.
  { route: "/dat-hang", ky_vong: ALL("→/don-dat") },
  { route: "/dat-hang/moi", ky_vong: ALL("→/don-dat/moi") },
  { route: "/hoa-don", ky_vong: ALL("→/duyet-don") },
  { route: "/xuat-kho", ky_vong: ALL("→/duyet-don") },
  { route: "/ton-kho", ky_vong: ALL("→/danh-muc") },
  // Phase 13 (PTICH-07): duyệt định mức thành tab của trang Phân tích.
  { route: "/ton-kho/dinh-muc", ky_vong: ALL("→/phan-tich") },
  // Nạp tồn tạm gỡ ở Phase 10.
  { route: "/ton-kho/nap-tam", ky_vong: ALL("→/danh-muc") },
  { route: "/danh-muc", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Phase 13: phân tích tồn mọi kho — quản lý + văn phòng (xem_duoc_phan_tich, 0079).
  { route: "/phan-tich", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/doi-tac", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },
  // Phase 14 (PANEL-03): trang chi tiết đối tác thành panel — link cũ chuyển
  // sang ?chon=<id>. Uuid giả vẫn đủ: redirect ở next.config.ts, không đọc DB.
  { route: "/doi-tac/00000000-0000-4000-8000-000000000001", ky_vong: ALL("→/doi-tac") },
  { route: "/doi-tac/ra-ghi-chu", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/cai-dat/nguoi-dung", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  // Phase 16 (QUYEN-01): sửa chức vụ cùng quyền với quản trị tài khoản (RLS 0082).
  // Job cron: proxy miễn kiểm phiên, route tự gác bằng CRON_SECRET — có đăng nhập
  // mà không có "Authorization: Bearer <CRON_SECRET>" cũng 401.
  { route: "/api/cron/ma-hoa", ky_vong: ALL("401") },
  { route: "/cai-dat/chuc-vu", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  // Nhân viên phụ trách (0077): cùng nhóm quyền ghi với danh mục — quản lý + văn phòng.
  { route: "/cai-dat/nhan-vien-phu-trach", ky_vong: { quanly: "200", vanphong: "200", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  // Phase 11 (NVPT-04): ba danh mục phụ rời Cài đặt, quản lý ở Danh sách hàng hóa.
  { route: "/cai-dat/nhom-hang", ky_vong: ALL("→/danh-muc") },
  { route: "/cai-dat/don-vi-tinh", ky_vong: ALL("→/danh-muc") },
  { route: "/cai-dat/cong-doan", ky_vong: ALL("→/danh-muc") },
  { route: "/cai-dat/so-chung-tu", ky_vong: { quanly: "200", vanphong: "quyen", thukho1: "quyen", chixem: "quyen", khach: "dangnhap" } },
  { route: "/api/danh-muc/mau-excel", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "401" } },
  // Phase 15 (IMP-01): file mẫu 4 cột — ai đăng nhập cũng tải được, như mẫu cũ.
  { route: "/api/danh-muc/mau-nhap-moi", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "401" } },
  // Phase 20 (UI3B-05): xuất Excel danh sách đơn theo bộ lọc — ai đăng nhập cũng xem được đơn.
  { route: "/api/don-dat/xuat-excel", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "401" } },
  // Mở /dang-nhap khi đã đăng nhập phải quay về page gốc, và `tiep_tuc` trỏ ra
  // ngoài miền thì bị vứt (safeRedirectPath) chứ không được chuyển hướng theo.
  { route: "/dang-nhap?tiep_tuc=//evil.com", ky_vong: { quanly: "goc", vanphong: "goc", thukho1: "goc", chixem: "goc", khach: "200" } },
  // Phase 6: phạm vi kho của thủ kho siết trong RPC (0066), không ở route.
  { route: "/kiem-ke", ky_vong: AI_CUNG_XEM },
  // UUID hợp lệ nhưng không tồn tại — trang render trạng thái rỗng phía
  // client (SessionDetail), page.tsx chỉ notFound() khi CHUỖI không đúng
  // khuôn UUID. Phạm vi kho siết ở RPC, không phải ở route.
  { route: "/kiem-ke/00000000-0000-4000-8000-000000000000", ky_vong: AI_CUNG_XEM },
  // Phase 10 (GON-02): màn đã gỡ — redirect trong next.config.ts chạy TRƯỚC
  // proxy nên cả khách cũng nhận →/danh-muc (rồi mới bị đẩy về đăng nhập).
  { route: "/lich-su-kiotviet", ky_vong: ALL("→/danh-muc") },
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

/** Lấy một id đơn đặt hàng có thật để kiểm route chi tiết `/don-dat/[id]`. */
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

/** Lấy một id hóa đơn (chứng từ XUAT) có thật để kiểm route chi tiết `/duyet-don/[id]`. */
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
 * Hai endpoint Excel của kiểm kê chỉ có GET (mẫu) / POST (nạp) — ma trận
 * thường (`doMot`, dùng GET) không nói được gì về quyền của route POST, và
 * GET không tham số của route mẫu không khớp kiểu `KyVong` hiện có ("200"
 * hay "quyen"/"dangnhap" đều sai — route trả JSON lỗi, không redirect).
 * Gọi trực tiếp bằng `fetch`, so mã trạng thái.
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

  // POST /api/danh-muc/doc-file-nhap-moi với FormData rỗng (Phase 15): chỉ quản lý
  // + văn phòng qua cửa quyền rồi dừng ở 400 (thiếu file); thủ kho, chỉ xem 403.
  const mongDocFile: Record<VaiTroTest, string> = {
    quanly: "400",
    vanphong: "400",
    thukho1: "403",
    chixem: "403",
    khach: "401",
  };
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/api/danh-muc/doc-file-nhap-moi`, {
      method: "POST",
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      body: new FormData(),
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== mongDocFile[vt]) {
      lech.push(`${"POST /api/danh-muc/doc-file-nhap-moi".padEnd(34)} ${vt.padEnd(9)} mong ${mongDocFile[vt]}, thực ${thuc}`);
    }
  }

  return { tong, lech };
}

/**
 * Ba route ảnh (09-09): GET /anh/[id] (đọc, mọi vai trò xem được), POST
 * /api/anh/tai-len và POST /api/anh/xoa (ghi, chỉ quản lý/văn phòng — D-02).
 * Gửi FormData/JSON rỗng cho hai route ghi: qua được cửa quyền thì dừng ở 400
 * (thiếu dữ liệu), không bao giờ chạm storage/DB thật.
 */
async function kiemAnh(
  cookie: Record<VaiTroTest, string>,
): Promise<{ tong: number; lech: string[] }> {
  const lech: string[] = [];
  let tong = 0;
  const role = Object.keys(cookie) as VaiTroTest[];

  // GET /anh/<uuid không tồn tại>: 4 vai trò đã đăng nhập -> 404, khách -> 401.
  const mongGetGia: Record<VaiTroTest, string> = {
    quanly: "404",
    vanphong: "404",
    thukho1: "404",
    chixem: "404",
    khach: "401",
  };
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/anh/00000000-0000-4000-8000-000000000000`, {
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== mongGetGia[vt]) {
      lech.push(
        `${"GET /anh/<uuid gia>".padEnd(34)} ${vt.padEnd(9)} mong ${mongGetGia[vt]}, thực ${thuc}`,
      );
    }
  }

  // Có ảnh thật thì kiểm luôn GET /anh/<id> và ?co=nho: 4 vai trò -> 200,
  // khách -> 401. Không có ảnh nào thì báo rõ, không giả vờ đã kiểm. Dùng
  // phiên quản lý (RLS chỉ cho đọc khi đã đăng nhập) để tìm một id có thật.
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
  const { error: loiDangNhap } = await sb.auth.signInWithPassword({
    email: TAI_KHOAN.quanly,
    password: samplePassword(),
  });
  const { data: anh } = loiDangNhap
    ? { data: null }
    : await sb.from("hinh_anh").select("id").limit(1);
  const idAnh = anh?.[0]?.id ?? null;
  if (idAnh) {
    const mongGetThat: Record<VaiTroTest, string> = {
      quanly: "200",
      vanphong: "200",
      thukho1: "200",
      chixem: "200",
      khach: "401",
    };
    for (const duong of [`/anh/${idAnh}`, `/anh/${idAnh}?co=nho`]) {
      for (const vt of role) {
        tong++;
        const res = await fetch(`${BASE_URL}${duong}`, {
          headers: cookie[vt] ? { cookie: cookie[vt] } : {},
          redirect: "manual",
        });
        const thuc = String(res.status);
        if (thuc !== mongGetThat[vt]) {
          lech.push(`${duong.padEnd(34)} ${vt.padEnd(9)} mong ${mongGetThat[vt]}, thực ${thuc}`);
        }
      }
    }
  } else {
    console.warn("⚠ chưa có ảnh nào — bỏ qua /anh/<id> thật");
  }

  const mongTaiLen: Record<VaiTroTest, string> = {
    quanly: "400",
    vanphong: "400",
    thukho1: "403",
    chixem: "403",
    khach: "401",
  };
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/api/anh/tai-len`, {
      method: "POST",
      headers: cookie[vt] ? { cookie: cookie[vt] } : {},
      body: new FormData(),
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== mongTaiLen[vt]) {
      lech.push(`${"POST /api/anh/tai-len".padEnd(34)} ${vt.padEnd(9)} mong ${mongTaiLen[vt]}, thực ${thuc}`);
    }
  }

  const mongXoa: Record<VaiTroTest, string> = {
    quanly: "400",
    vanphong: "400",
    thukho1: "403",
    chixem: "403",
    khach: "401",
  };
  for (const vt of role) {
    tong++;
    const res = await fetch(`${BASE_URL}/api/anh/xoa`, {
      method: "POST",
      headers: {
        ...(cookie[vt] ? { cookie: cookie[vt] } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      redirect: "manual",
    });
    const thuc = String(res.status);
    if (thuc !== mongXoa[vt]) {
      lech.push(`${"POST /api/anh/xoa".padEnd(34)} ${vt.padEnd(9)} mong ${mongXoa[vt]}, thực ${thuc}`);
    }
  }

  return { tong, lech };
}

/**
 * TEN-02: `doMot` chỉ so pathname — kiểm riêng Location ĐẦY ĐỦ: query đi theo
 * redirect, và khách chưa đăng nhập về /dang-nhap với tiep_tuc = đường MỚI.
 */
async function kiemChuyenHuongDayDu(
  cookie: Record<VaiTroTest, string>,
  idDon: string | null,
): Promise<{ tong: number; lech: string[] }> {
  const lech: string[] = [];
  let tong = 0;
  const viTri = async (duong: string, ck: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}${duong}`, { headers: ck ? { cookie: ck } : {}, redirect: "manual" });
    const loc = res.headers.get("location");
    if (!loc) return `HTTP ${res.status} không có Location`;
    const u = new URL(loc, BASE_URL);
    return `${u.pathname}${u.search}`;
  };
  const so = (nhan: string, thuc: string, mong: string) => {
    tong++;
    if (thuc !== mong) lech.push(`${nhan.padEnd(44)} mong ${mong}, thực ${thuc}`);
  };
  const cap: [string, string][] = [
    ["/dat-hang?trang=2&q=abc", "/don-dat?trang=2&q=abc"],
    ["/hoa-don?trang_thai=HOAN_THANH&trang=3", "/duyet-don?trang_thai=HOAN_THANH&trang=3"],
    ["/xuat-kho?trang=2", "/duyet-don?trang=2"],
    ["/dat-hang/moi?x=1", "/don-dat/moi?x=1"],
    ...(idDon ? ([[`/dat-hang/${idDon}/in?x=1`, `/don-dat/${idDon}/in?x=1`]] as [string, string][]) : []),
  ];
  for (const [cu, moi] of cap) {
    so(`quanly ${cu}`, await viTri(cu, cookie.quanly), moi);
    so(`khach ${cu}`, await viTri(cu, ""), moi);
  }
  // Hai bước của khách: link cũ → đường mới → /dang-nhap?tiep_tuc=<đường mới + query>.
  const buoc1 = await viTri("/dat-hang/moi?x=1", "");
  const buoc2 = new URL(await viTri(buoc1, ""), BASE_URL);
  so("khach /dat-hang/moi?x=1 bước 2 (pathname)", buoc2.pathname, "/dang-nhap");
  so("khach /dat-hang/moi?x=1 bước 2 (tiep_tuc)", buoc2.searchParams.get("tiep_tuc") ?? "", "/don-dat/moi?x=1");
  return { tong, lech };
}

/**
 * QUYEN-04 (Phase 16): ma trận chạy THEO CHỨC VỤ. Bật/tắt quyền của chức vụ
 * bằng service role rồi gọi lại bằng ĐÚNG cookie đã đăng nhập từ trước — đổi
 * quyền không cần token mới. Luôn trả quyền về như cũ, kể cả khi lỗi giữa chừng.
 */
async function kiemTheoChucVu(cookie: Record<VaiTroTest, string>): Promise<{ tong: number; lech: string[] }> {
  const admin = taoAdminClient();
  const { data: chucVu, error } = await admin.from("chuc_vu").select("id, ma");
  if (error) throw error;
  const idCua = (ma: string) => {
    const id = chucVu?.find((c) => c.ma === ma)?.id;
    if (!id) throw new Error(`Không có chức vụ ${ma} — chạy migration 0082.`);
    return id;
  };

  const doi: Array<{ ma: string; quyen: BusinessPermission; bat: boolean }> = [
    { ma: "NHAN_VIEN", quyen: "xem_dashboard", bat: true },
    { ma: "THU_KHO", quyen: "tao_don", bat: true },
    { ma: "THU_KHO", quyen: "tao_nhan_vien", bat: true },
    { ma: "THU_KHO", quyen: "kiem_kho", bat: false },
    { ma: "NHAN_VIEN", quyen: "tao_ma_hang", bat: false },
    { ma: "QUAN_LY", quyen: "xem_dashboard", bat: false },
  ];
  const datQuyen = async (ma: string, quyen: BusinessPermission, bat: boolean) => {
    const bang = admin.from("chuc_vu_quyen");
    const { error: loi } = bat
      ? await bang.upsert({ chuc_vu_id: idCua(ma), quyen }, { ignoreDuplicates: true })
      : await bang.delete().eq("chuc_vu_id", idCua(ma)).eq("quyen", quyen);
    if (loi) throw loi;
  };

  const lech: string[] = [];
  let tong = 0;
  const so = (nhan: string, thuc: string, mong: string) => {
    tong++;
    if (thuc !== mong) lech.push(`${nhan.padEnd(44)} mong ${mong}, thực ${thuc}`);
  };
  const postRong = async (duong: string, vt: VaiTroTest) =>
    String(
      (await fetch(`${BASE_URL}${duong}`, {
        method: "POST",
        headers: { cookie: cookie[vt] },
        body: new FormData(),
        redirect: "manual",
      })).status,
    );

  try {
    for (const d of doi) await datQuyen(d.ma, d.quyen, d.bat);

    so("vanphong / (bật Xem dashboard)", String(await doMot("/", cookie.vanphong)), "200");
    // Tắt cho quản lý: về /duyet-don, KHÔNG chuyển hướng vòng tròn về "/".
    so("quanly / (tắt Xem dashboard)", String(await doMot("/", cookie.quanly)), "→/duyet-don");
    so("thukho1 /don-dat/moi (bật Tạo đơn)", String(await doMot("/don-dat/moi", cookie.thukho1)), "200");
    so("thukho1 /cai-dat (bật Tạo nhân viên)", String(await doMot("/cai-dat", cookie.thukho1)), "→/cai-dat/nhan-vien-phu-trach");
    so("thukho1 /cai-dat/nhan-vien-phu-trach", String(await doMot("/cai-dat/nhan-vien-phu-trach", cookie.thukho1)), "200");
    so("thukho1 POST kiem-ke/nhap-excel (tắt Kiểm kho)", await postRong("/api/kiem-ke/nhap-excel", "thukho1"), "403");
    so("vanphong POST doc-file-nhap-moi (tắt Tạo mã)", await postRong("/api/danh-muc/doc-file-nhap-moi", "vanphong"), "403");
    so("vanphong /cai-dat/nhan-vien-phu-trach (vẫn có)", String(await doMot("/cai-dat/nhan-vien-phu-trach", cookie.vanphong)), "200");
  } finally {
    for (const d of doi) await datQuyen(d.ma, d.quyen, !d.bat);
  }

  // Trả về như cũ: route quay lại đúng hành vi mặc định ngay, cùng phiên.
  so("vanphong / (trả quyền)", String(await doMot("/", cookie.vanphong)), "→/duyet-don");
  so("thukho1 /don-dat/moi (trả quyền)", String(await doMot("/don-dat/moi", cookie.thukho1)), "quyen");

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
      { route: `/nhap-hang/${idPhieu}`, ky_vong: AI_CUNG_XEM },
      { route: `/nhap-hang/${idPhieu}/in`, ky_vong: AI_CUNG_XEM },
    );
  } else {
    console.warn("⚠ chưa có phiếu nhập nào — bỏ qua 2 route chi tiết");
  }

  const idDon = await layIdDon();
  if (idDon) {
    // /don-dat/[id]/in cùng quyền xem: T-04-61 chấp nhận thu_kho/chi_xem mở
    // thẳng tờ đi lấy hàng, route vẫn chặn khách chưa đăng nhập.
    MA_TRAN.push(
      { route: `/don-dat/${idDon}`, ky_vong: AI_CUNG_XEM },
      { route: `/don-dat/${idDon}/in`, ky_vong: AI_CUNG_XEM },
      { route: `/dat-hang/${idDon}`, ky_vong: ALL(`→/don-dat/${idDon}`) },
      { route: `/dat-hang/${idDon}/in`, ky_vong: ALL(`→/don-dat/${idDon}/in`) },
    );
  } else {
    console.warn("⚠ chưa có đơn đặt hàng nào — bỏ qua route /don-dat/[id] và /in");
  }

  const idPhieuXuat = await layIdPhieuXuat();
  if (idPhieuXuat) {
    // /in cùng quyền xem với trang chi tiết — bẫy 12, plan 04-14.
    MA_TRAN.push(
      { route: `/duyet-don/${idPhieuXuat}`, ky_vong: AI_CUNG_XEM },
      { route: `/duyet-don/${idPhieuXuat}/in`, ky_vong: AI_CUNG_XEM },
      // Bookmark cũ /hoa-don và /xuat-kho giữ nguyên id, đi THẲNG sang /duyet-don.
      { route: `/hoa-don/${idPhieuXuat}`, ky_vong: ALL(`→/duyet-don/${idPhieuXuat}`) },
      { route: `/hoa-don/${idPhieuXuat}/in`, ky_vong: ALL(`→/duyet-don/${idPhieuXuat}/in`) },
      { route: `/xuat-kho/${idPhieuXuat}`, ky_vong: ALL(`→/duyet-don/${idPhieuXuat}`) },
      { route: `/xuat-kho/${idPhieuXuat}/in`, ky_vong: ALL(`→/duyet-don/${idPhieuXuat}/in`) },
    );
  } else {
    console.warn("⚠ chưa có hóa đơn nào — bỏ qua route /duyet-don/[id] và /in");
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

  const kiemKe = await kiemKiemKeExcel(cookie);
  tong += kiemKe.tong;
  lech.push(...kiemKe.lech);

  const anh = await kiemAnh(cookie);
  tong += anh.tong;
  lech.push(...anh.lech);

  const theoChucVu = await kiemTheoChucVu(cookie);
  tong += theoChucVu.tong;
  lech.push(...theoChucVu.lech);

  const chuyenHuong = await kiemChuyenHuongDayDu(cookie, idDon);
  tong += chuyenHuong.tong;
  lech.push(...chuyenHuong.lech);

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
