import { z } from "zod";

/**
 * Biến môi trường công khai (gửi xuống trình duyệt).
 * Chỉ đặt ở đây những giá trị KHÔNG bí mật.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url(
      "NEXT_PUBLIC_SUPABASE_URL phải là URL hợp lệ, ví dụ https://xxx.supabase.co",
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

/**
 * Phải viết `process.env.TÊN_BIẾN` dạng literal thì Next.js mới thay được
 * giá trị vào bundle client. Không được truy cập động (process.env[key]).
 */
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const chiTiet = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Cấu hình biến môi trường chưa đúng:\n${chiTiet}\n\n` +
      `Cách xử lý: sao chép .env.example thành .env.local rồi điền giá trị lấy từ ` +
      `Supabase Dashboard > Project Settings > API.`,
  );
}

export const env = parsed.data;
