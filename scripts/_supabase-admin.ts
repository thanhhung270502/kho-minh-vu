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

export const TAI_KHOAN_MAU = [
  { email: "quanly@khominhvu.local",   hoTen: "Quản lý demo",    vaiTro: "quan_ly"   as const, maKho: [] as string[] },
  { email: "vanphong@khominhvu.local", hoTen: "Văn phòng demo",  vaiTro: "van_phong" as const, maKho: [] as string[] },
  { email: "thukho1@khominhvu.local",  hoTen: "Thủ kho K1",      vaiTro: "thu_kho"   as const, maKho: ["K1"] },
  { email: "thukho2@khominhvu.local",  hoTen: "Thủ kho K1 + K2", vaiTro: "thu_kho"   as const, maKho: ["K1", "K2"] },
  { email: "chixem@khominhvu.local",   hoTen: "Chỉ xem demo",    vaiTro: "chi_xem"   as const, maKho: [] as string[] },
];

export function matKhauMau(): string {
  return process.env.SEED_USER_PASSWORD ?? "MatKhauDemo123!";
}
