import { z } from "zod";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { buildNewProductWorkbook } from "@/features/products/lib/read-new-product-file.server";

export const runtime = "nodejs";

const bodySchema = z.object({
  rows: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        stock: z.number().nullable(),
        description: z.string(),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(10_000),
});

/**
 * File Excel chỉ chứa dòng lỗi + cột "Lý do" (IMP-03). Dựng ở server vì exceljs
 * nặng với trình duyệt; file sửa xong nhập lại thẳng vào màn "Nhập mã hàng mới".
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để tải file lỗi." },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { title: "Không có dòng lỗi để xuất", action: "Tải lại file lên rồi thử lần nữa." },
      { status: 400 },
    );
  }

  const buf = await buildNewProductWorkbook(parsed.data.rows);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ma-hang-loi.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
