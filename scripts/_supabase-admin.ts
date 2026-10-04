import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "../src/types/database.types";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Client `service_role` dùng cho script quản trị. Khóa này BỎ QUA MỌI RLS —
 * chỉ dùng trong `scripts/`, không bao giờ import vào `src/`.
 */
export function taoAdminClient(): SupabaseClient<Database> {
  // Vercel (Supabase integration) đặt tên SUPABASE_URL / SUPABASE_SECRET_KEY,
  // .env.local đặt NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — nhận cả hai.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Cách xử lý: sao chép .env.example thành .env.local rồi điền giá trị lấy từ\n" +
        "Supabase Dashboard > Project Settings > API.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Client `anon` — mô phỏng đúng luồng của người dùng thật, chịu RLS. */
export function taoAnonClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
        "Sao chép .env.example thành .env.local rồi điền giá trị.",
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const SAMPLE_ACCOUNTS = [
  { email: "quanly@khominhvu.local",   fullName: "Quản lý demo",    role: "quan_ly"   as const, maKho: [] as string[] },
  { email: "vanphong@khominhvu.local", fullName: "Văn phòng demo",  role: "van_phong" as const, maKho: [] as string[] },
  { email: "thukho1@khominhvu.local",  fullName: "Thủ kho K1",      role: "thu_kho"   as const, maKho: ["K1"] },
  { email: "thukho2@khominhvu.local",  fullName: "Thủ kho K1 + K2", role: "thu_kho"   as const, maKho: ["K1", "K2"] },
  { email: "chixem@khominhvu.local",   fullName: "Chỉ xem demo",    role: "chi_xem"   as const, maKho: [] as string[] },
];

export function samplePassword(): string {
  return process.env.SEED_USER_PASSWORD ?? "MatKhauDemo123!";
}

/**
 * Đăng nhập tài khoản chạy script NẠP DỮ LIỆU (chứng từ, mã hàng). Bắt buộc khai
 * IMPORT_USER_EMAIL / IMPORT_USER_PASSWORD — KHÔNG rơi về mật khẩu demo của
 * samplePassword(): mật khẩu đó nằm trong repo, còn script nạp chạy trên cloud thật.
 * Tài khoản phải có quyền ghi chứng từ / tạo mã hàng (thường là quản lý).
 */
export async function dangNhapTaiKhoanNap(client: SupabaseClient<Database>): Promise<void> {
  const email = process.env.IMPORT_USER_EMAIL?.trim();
  const password = process.env.IMPORT_USER_PASSWORD;
  if (!email || !password) {
    console.error(
      "Thiếu IMPORT_USER_EMAIL hoặc IMPORT_USER_PASSWORD.\n" +
        "Cách xử lý: khai hai biến này (tài khoản quản lý thật, có quyền ghi chứng từ / tạo mã hàng)\n" +
        "trong .env.local hoặc ngay trên dòng lệnh, rồi chạy lại. Script nạp không dùng mật khẩu demo.",
    );
    process.exit(1);
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Không đăng nhập được bằng ${email}: ${error.message}. Kiểm lại IMPORT_USER_EMAIL / IMPORT_USER_PASSWORD.`);
    process.exit(1);
  }
}
