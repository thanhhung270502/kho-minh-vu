import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Client dùng ở phía server (Server Component, Route Handler, Server Action).
 *
 * Luôn tạo mới mỗi request — KHÔNG cache ra biến module, vì mỗi request là
 * một người dùng khác nhau, dùng chung instance sẽ rò rỉ phiên đăng nhập.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component không được phép ghi cookie. Bỏ qua an toàn:
            // middleware (src/middleware.ts) đã làm mới phiên trước đó rồi.
          }
        },
      },
    },
  );
}
