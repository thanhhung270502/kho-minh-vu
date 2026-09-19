import "server-only";

import { z } from "zod";

/**
 * Biến môi trường CHỈ dùng phía server. Không bao giờ để lọt vào bundle trình duyệt:
 * đặt khóa quản trị vào biến `NEXT_PUBLIC_*` là mất sạch quyền kiểm soát database.
 *
 * Cùng một giá trị nhưng hai nơi đặt tên khác nhau, nên đọc cả hai:
 *   - .env.local         : SUPABASE_SERVICE_ROLE_KEY
 *   - Vercel (Supabase integration) : SUPABASE_SECRET_KEY
 *
 * Đọc lười (lazy) chứ không parse lúc import: `next build` chạy được mà không cần
 * khóa quản trị, chỉ màn Cài đặt → Người dùng mới thật sự cần.
 */
const envServerSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, "Thiếu SUPABASE_SECRET_KEY (hoặc SUPABASE_SERVICE_ROLE_KEY)"),
});

export function getServerEnv() {
  // Dùng `||` chứ không `??`: biến khai trên Vercel nhưng bỏ trống sẽ là chuỗi
  // rỗng, `??` sẽ nhận chuỗi rỗng đó và bỏ qua tên biến còn lại.
  const parsed = envServerSchema.safeParse({
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Chưa cấu hình khóa quản trị Supabase.\n" +
        "Chạy local: mở .env.local, điền SUPABASE_SERVICE_ROLE_KEY lấy từ " +
        "Dashboard > Project Settings > API Keys > service_role (hoặc secret key " +
        "dạng sb_secret_...), rồi khởi động lại server.\n" +
        "Trên Vercel: integration Supabase đã tạo sẵn SUPABASE_SECRET_KEY.",
    );
  }

  return parsed.data;
}
