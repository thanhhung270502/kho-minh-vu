import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { taoFileMau } from "@/features/danh-muc/lib/doc-file-danh-muc.server";

export const runtime = "nodejs";

/** File mẫu trống để người dùng điền rồi nhập lại (D-23). */
export async function GET() {
  const nd = await getCurrentUser();
  if (!nd) {
    return Response.json(
      {
        title: "Phiên đăng nhập đã hết hạn",
        action: "Đăng nhập lại để tải file mẫu.",
      },
      { status: 401 },
    );
  }

  const buf = await taoFileMau([], { coGiaVon: false });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-danh-muc.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
