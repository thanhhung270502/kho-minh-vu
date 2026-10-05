import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchFilteredRows, MAX_EXPORT } from "@/features/document-excel/api/document-export.server";
import { KIND_LABELS } from "@/features/document-excel/lib/document-excel";
import { buildDocumentWorkbook } from "@/features/document-excel/lib/document-excel-file.server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Xuất hóa đơn / phiếu nhập đang lọc trên màn danh sách (tham số URL giống hệt
 * màn đó). Cột giống file mẫu nên phiếu còn nháp sửa xong nhập lại bằng "Cập nhật".
 * Đơn đặt có route xuất riêng (/api/don-dat/xuat-excel).
 */
export async function GET(request: Request, { params }: { params: Promise<{ loai: string }> }) {
  const { loai } = await params;
  if (loai !== "hoa-don" && loai !== "phieu-nhap") {
    return Response.json({ title: "Loại chứng từ không hợp lệ", action: "Mở lại trang rồi thử lần nữa." }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại để xuất file." }, { status: 401 });
  }

  try {
    const { total, rows } = await fetchFilteredRows(loai, new URL(request.url).searchParams);
    if (total > MAX_EXPORT) {
      return Response.json(
        {
          title: `Đang lọc ${total.toLocaleString("vi-VN")} phiếu — tối đa ${MAX_EXPORT.toLocaleString("vi-VN")} phiếu mỗi lần xuất`,
          action: "Thu hẹp khoảng ngày hoặc thêm bộ lọc rồi xuất lại.",
        },
        { status: 422 },
      );
    }
    const buf = await buildDocumentWorkbook(loai, "cap_nhat", rows, "Danh sách");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${KIND_LABELS[loai].file}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const explained = explainError(error);
    return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
  }
}
