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

/**
 * Biến môi trường cho lớp lưu ảnh mã hàng qua Google Drive/Apps Script — D-07.
 * TUYỆT ĐỐI không NEXT_PUBLIC_: lộ secret là ai cũng ghi/xóa được file trên Drive
 * của hệ thống. Đọc lười, không parse lúc import, để `next build` chạy khi chưa khai.
 */
const appsScriptSchema = z.object({
  APPS_SCRIPT_URL: z
    .string()
    .url("APPS_SCRIPT_URL phải là URL web app kết thúc /exec")
    .refine((u) => u.endsWith("/exec"), "APPS_SCRIPT_URL phải kết thúc bằng /exec"),
  APPS_SCRIPT_SECRET: z.string().min(16, "APPS_SCRIPT_SECRET quá ngắn (tối thiểu 16 ký tự)"),
});

export function getAppsScriptEnv(): { APPS_SCRIPT_URL: string; APPS_SCRIPT_SECRET: string } {
  // Dùng `||` chứ không `??` — cùng lý do với getServerEnv() ở trên (bẫy 17).
  const parsed = appsScriptSchema.safeParse({
    APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL || undefined,
    APPS_SCRIPT_SECRET: process.env.APPS_SCRIPT_SECRET || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      "Chưa cấu hình lưu ảnh (Apps Script).\n" +
        "Làm theo apps-script/README.md mục 5-8: khai APPS_SCRIPT_URL và " +
        "APPS_SCRIPT_SECRET trong .env.local (và Vercel), rồi khởi động lại server.",
    );
  }

  return parsed.data;
}

/**
 * Job đồng bộ bộ mã hóa (Quy chuẩn mã). CRON_SECRET: Vercel Cron gửi kèm
 * `Authorization: Bearer <CRON_SECRET>` — thiếu thì route từ chối mọi lời gọi.
 * MA_HOA_SHEET_ID: sheet công khai chứa 10 cột quy chuẩn; mặc định là file
 * trung gian (file gốc của bên làm mã đang để riêng tư).
 */
export function getCodeSyncEnv(): { CRON_SECRET: string | null; MA_HOA_SHEET_ID: string } {
  // `||` chứ không `??` — biến khai trên Vercel nhưng để trống là chuỗi rỗng (bẫy 17).
  return {
    CRON_SECRET: process.env.CRON_SECRET || null,
    MA_HOA_SHEET_ID: process.env.MA_HOA_SHEET_ID || "1PkbqzSaEF7W_LOrxxMLbgPokS71M0QNhIuA4IShnkOc",
  };
}
