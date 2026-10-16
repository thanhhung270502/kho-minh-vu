import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { buildNewProductWorkbook } from "@/features/products/lib/read-new-product-file.server";

export const runtime = "nodejs";

/** File mẫu nhập mã mới — cùng 9 cột với file cập nhật mã hàng (IMP-01). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để tải file mẫu." },
      { status: 401 },
    );
  }

  const buf = await buildNewProductWorkbook([]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-ma-hang-moi.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
