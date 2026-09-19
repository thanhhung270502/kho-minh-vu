import { z } from "zod";

/**
 * Biến môi trường công khai (gửi xuống trình duyệt).
 * Chỉ đặt ở đây những giá trị KHÔNG bí mật.
 *
 * Cùng một giá trị nhưng hai nơi đặt tên khác nhau, nên đọc cả hai:
 *   - .env.local         : NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - Vercel (Supabase integration) : NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Riêng URL thì integration chỉ đặt `SUPABASE_URL` — không có tiền tố
 * NEXT_PUBLIC_ nên Next.js KHÔNG nhúng được vào bundle trình duyệt. Vì vậy
 * NEXT_PUBLIC_SUPABASE_URL vẫn phải tự khai trong Vercel > Settings >
 * Environment Variables, không có đường vòng.
 */
const publicEnvSchema = z.object({
  SUPABASE_URL: z
    .string()
    .url(
      "NEXT_PUBLIC_SUPABASE_URL phải là URL hợp lệ, ví dụ https://xxx.supabase.co",
    ),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(
      1,
      "Thiếu NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    ),
});

/**
 * Phải viết `process.env.TÊN_BIẾN` dạng literal thì Next.js mới thay được
 * giá trị vào bundle client. Không được truy cập động (process.env[key]).
 *
 * Dùng `||` chứ không `??`: biến khai trên Vercel nhưng bỏ trống sẽ là chuỗi
 * rỗng, `??` sẽ nhận chuỗi rỗng đó và bỏ qua tên biến còn lại.
 */
const parsed = publicEnvSchema.safeParse({
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const chiTiet = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Cấu hình biến môi trường chưa đúng:\n${chiTiet}\n\n` +
      `Chạy local: sao chép .env.example thành .env.local rồi điền giá trị lấy từ ` +
      `Supabase Dashboard > Project Settings > API Keys.\n` +
      `Trên Vercel: Settings > Environment Variables — integration Supabase KHÔNG ` +
      `tạo NEXT_PUBLIC_SUPABASE_URL, phải tự thêm.`,
  );
}

export const env = parsed.data;
