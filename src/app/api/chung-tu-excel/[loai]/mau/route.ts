import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchDraftRows } from "@/features/document-excel/api/document-drafts.server";
import { isDocumentKind, KIND_LABELS } from "@/features/document-excel/lib/document-excel";
import { buildDocumentWorkbook } from "@/features/document-excel/lib/document-excel-file.server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/**
 * File mẫu: `?kieu=moi` trống; `?kieu=cap_nhat` điền sẵn các phiếu còn nháp
 * (đơn tạm / phiếu chưa ghi sổ) để sửa thẳng trên file rồi nhập lại.
 */
export async function GET(request: Request, { params }: { params: Promise<{ loai: string }> }) {
  const { loai } = await params;
  if (!isDocumentKind(loai)) {
    return Response.json({ title: "Loại chứng từ không hợp lệ", action: "Mở lại trang rồi thử lần nữa." }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để tải file mẫu." },
      { status: 401 },
    );
  }

  const mode = new URL(request.url).searchParams.get("kieu") === "cap_nhat" ? "cap_nhat" : "moi";
  let rows;
  try {
    rows = mode === "cap_nhat" ? await fetchDraftRows(loai) : [];
  } catch (error) {
    const explained = explainError(error);
    return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
  }

  const buf = await buildDocumentWorkbook(loai, mode, rows);
  const name = `mau-${mode === "moi" ? "nhap-moi" : "cap-nhat"}-${KIND_LABELS[loai].file}.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
