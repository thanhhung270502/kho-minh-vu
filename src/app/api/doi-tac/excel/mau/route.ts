import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchListedPartners } from "@/features/partners/api/partner-excel.server";
import { buildPartnerWorkbook } from "@/features/partners/lib/partner-excel-file.server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/**
 * File mẫu đối tác: `?kieu=moi` trống; `?kieu=cap_nhat` điền đủ thông tin các đối tác
 * đang lọc trên màn Đối tác (tham số lọc đi kèm URL).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để tải file mẫu." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("kieu") === "cap_nhat" ? "cap_nhat" : "moi";
  try {
    const partners = mode === "cap_nhat" ? await fetchListedPartners(params) : [];
    const buf = await buildPartnerWorkbook(mode, partners);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau-${mode === "moi" ? "nhap-moi" : "cap-nhat"}-doi-tac.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const explained = explainError(error);
    return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
  }
}
