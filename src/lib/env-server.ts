import "server-only";

import { z } from "zod";

/**
 * Biến môi trường CHỈ dùng phía server. Không bao giờ để lọt vào bundle trình duyệt:
 * đặt `service_role` vào biến `NEXT_PUBLIC_*` là mất sạch quyền kiểm soát database.
 *
 * Đọc lười (lazy) chứ không parse lúc import: `next build` chạy được mà không cần
 * khóa quản trị, chỉ màn Cài đặt → Người dùng mới thật sự cần.
 */
const envServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Thiếu SUPABASE_SERVICE_ROLE_KEY"),
});

export function layEnvServer() {
  const parsed = envServerSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Chưa cấu hình khóa quản trị Supabase.\n" +
        "Cách xử lý: mở .env.local, điền SUPABASE_SERVICE_ROLE_KEY lấy từ " +
        "Dashboard > Project Settings > API > service_role, rồi khởi động lại server.",
    );
  }

  return parsed.data;
}
