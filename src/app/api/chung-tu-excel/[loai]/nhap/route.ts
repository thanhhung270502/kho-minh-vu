import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { importDocuments } from "@/features/document-excel/api/document-import.server";
import { canImportDocuments } from "@/features/document-excel/lib/document-access";
import { groupDocuments, isDocumentKind, KIND_LABELS } from "@/features/document-excel/lib/document-excel";
import { readDocumentFile } from "@/features/document-excel/lib/document-excel-file.server";
import { NEGATIVE_REASON_LABELS } from "@/features/documents/lib/negative-reasons";
import { explainError } from "@/shared/lib/errors";

/** exceljs cần Node (stream, zip) — Edge runtime không chạy được. */
export const runtime = "nodejs";
/** File lịch sử vài chục nghìn dòng: nhiều lô RPC nối nhau. */
export const maxDuration = 300;

const MAX_FILE_MB = 20;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/**
 * Nhập đơn đặt / hóa đơn / phiếu nhập từ Excel. Form: file, kieu (moi|cap_nhat),
 * che_do (kiem_tra|nap). Đọc file ở server (bẫy 7), gọi RPC bằng phiên của người
 * dùng — quyền kiểm lại ở database.
 */
export async function POST(request: Request, { params }: { params: Promise<{ loai: string }> }) {
  const { loai } = await params;
  if (!isDocumentKind(loai)) {
    return errorResponse("Loại chứng từ không hợp lệ", "Mở lại trang rồi thử lần nữa.", 404);
  }
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi tải file lên lần nữa.", 401);
  }
  if (!canImportDocuments(user, loai)) {
    return errorResponse(
      `Tài khoản không có quyền nhập ${KIND_LABELS[loai].one}`,
      "Liên hệ quản lý nếu bạn cần quyền.",
      403,
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const mode = form.get("kieu") === "cap_nhat" ? "cap_nhat" : "moi";
  const commit = form.get("che_do") === "nap";

  if (!(file instanceof File)) {
    return errorResponse("Chưa chọn file", "Chọn một file Excel (.xlsx) rồi thử lại.", 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return errorResponse("File không phải .xlsx", "Mở file bằng Excel rồi Lưu thành định dạng .xlsx, sau đó tải lại.", 400);
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return errorResponse(`File lớn hơn ${MAX_FILE_MB}MB`, "Chia nhỏ file rồi nhập từng phần.", 413);
  }

  let rows;
  try {
    rows = await readDocumentFile(Buffer.from(await file.arrayBuffer()), loai);
  } catch (e) {
    return errorResponse(
      "Không đọc được file",
      // exceljs ném lỗi zip ("invalid signature", "central directory") khi file không phải .xlsx thật.
      e instanceof Error && !/signature|zip|central directory/i.test(e.message)
        ? e.message
        : "File không phải Excel hợp lệ — mở bằng Excel rồi Lưu thành .xlsx, sau đó tải lại.",
      422,
    );
  }
  if (rows.length === 0) {
    return errorResponse("File không có dòng dữ liệu", "Điền dữ liệu từ dòng thứ 2 (dòng 1 là tiêu đề cột).", 422);
  }

  const { documents, issues } = groupDocuments(rows, NEGATIVE_REASON_LABELS as Record<string, string>);

  try {
    const result = await importDocuments(loai, mode, documents, issues, commit);
    return Response.json({ result });
  } catch (error) {
    const explained = explainError(error);
    const status =
      explained.kind === "forbidden" ? 403 : explained.kind === "invalid-data" ? 422 : explained.kind === "session-expired" ? 401 : 500;
    return errorResponse(explained.title, explained.action, status);
  }
}
