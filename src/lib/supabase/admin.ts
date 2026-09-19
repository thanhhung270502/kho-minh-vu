import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { layEnvServer } from "@/lib/env-server";
import type { Database } from "@/types/database.types";

/**
 * Client `service_role` — BỎ QUA MỌI RLS.
 *
 * Chỉ dùng cho hai việc mà phiên của người dùng không làm được:
 *   1. `auth.admin.*` (tạo tài khoản, đổi mật khẩu, khóa/mở tài khoản)
 *   2. RPC `thu_hoi_phien_nguoi_dung` (chỉ cấp cho service_role)
 *
 * Dữ liệu nghiệp vụ (bảng `nguoi_dung`, `nguoi_dung_kho`) vẫn ghi bằng client của
 * chính người quản lý đang thao tác, để RLS kiểm và trigger nhật ký ghi đúng
 * `auth.uid()` thay vì để trống.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    env.SUPABASE_URL,
    layEnvServer().SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
