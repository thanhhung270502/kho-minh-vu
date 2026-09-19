import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Làm mới access token của Supabase trên mỗi request và ghi cookie mới
 * vào response. Không có bước này, phiên đăng nhập sẽ hết hạn giữa chừng
 * và Server Component sẽ đọc phải phiên cũ.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Bắt buộc gọi getUser() (không phải getSession()): chỉ getUser() mới xác
  // thực token với server Supabase. getSession() chỉ đọc cookie, giả mạo được.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
