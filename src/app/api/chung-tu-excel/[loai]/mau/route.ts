import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchFilteredRows, MAX_EXPORT } from "@/features/document-excel/api/document-export.server";
import { isDocumentKind, KIND_LABELS } from "@/features/document-excel/lib/document-excel";
import { buildDocumentWorkbook } from "@/features/document-excel/lib/document-excel-file.server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * File mẫu: `?kieu=moi` trống; `?kieu=cap_nhat` điền ĐỦ thông tin các phiếu đang lọc
 * trên màn danh sách (tham số lọc đi kèm URL) để sửa thẳng trên file rồi nhập lại.
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

  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("kieu") === "cap_nhat" ? "cap_nhat" : "moi";
  let rows: Awaited<ReturnType<typeof fetchFilteredRows>>["rows"] = [];
  if (mode === "cap_nhat") {
    try {
      const result = await fetchFilteredRows(loai, searchParams);
      if (result.total > MAX_EXPORT) {
        return Response.json(
          {
            title: `Đang lọc ${result.total.toLocaleString("vi-VN")} phiếu — mẫu cập nhật tối đa ${MAX_EXPORT.toLocaleString("vi-VN")} phiếu`,
            action: "Thu hẹp khoảng ngày hoặc thêm bộ lọc rồi tải lại.",
          },
          { status: 422 },
        );
      }
      rows = result.rows;
    } catch (error) {
      const explained = explainError(error);
      return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
    }
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
