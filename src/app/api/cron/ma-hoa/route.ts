import { timingSafeEqual } from "node:crypto";

import { syncCodeDictionary } from "@/features/product-codes/api/sync.server";
import { getCodeSyncEnv } from "@/lib/env-server";

export const runtime = "nodejs";
// Luôn chạy thật, không cache — Vercel Cron gọi GET.
export const dynamic = "force-dynamic";

/**
 * Đồng bộ bộ mã hóa hằng ngày (vercel.json → crons). Không dùng phiên đăng
 * nhập: proxy.ts miễn đường dẫn này, route tự gác bằng CRON_SECRET.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = getCodeSyncEnv();
  if (!CRON_SECRET) {
    return Response.json(
      { title: "Chưa cấu hình CRON_SECRET", action: "Khai CRON_SECRET trên Vercel rồi deploy lại." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request.headers.get("authorization"), CRON_SECRET)) {
    return Response.json({ title: "Không có quyền chạy job đồng bộ" }, { status: 401 });
  }

  const result = await syncCodeDictionary("cron");
  if (result.ok) return Response.json({ thanh_cong: true, so_muc: result.counts });

  // Lỗi vẫn trả về để log Vercel ghi rõ lý do; từ điển cũ giữ nguyên.
  const status = result.stage === "fetch" ? 502 : 422;
  return Response.json({ thanh_cong: false, giai_doan: result.stage, loi: result.message }, { status });
}

/** So sánh hằng thời gian — `!==` lộ độ dài tiền tố khớp qua thời gian phản hồi. */
function isAuthorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
