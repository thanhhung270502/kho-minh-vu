import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchListedPartners } from "@/features/partners/api/partner-excel.server";
import { buildPartnerWorkbook } from "@/features/partners/lib/partner-excel-file.server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/**
 * Xuất đối tác đang lọc trên màn Đối tác. Cùng cột với file mẫu nên sửa xong nhập lại
 * được bằng "Cập nhật".
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để xuất file." }, { status: 401 });
  }
  try {
    const partners = await fetchListedPartners(new URL(request.url).searchParams);
    const buf = await buildPartnerWorkbook("cap_nhat", partners, "Đối tác");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="doi-tac.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const explained = explainError(error);
    return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
  }
}
