import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { importPartners } from "@/features/partners/api/partner-excel.server";
import { readPartnerFile } from "@/features/partners/lib/partner-excel-file.server";
import { explainError } from "@/shared/lib/errors";
import { hasPermission } from "@/shared/lib/permissions";

/** exceljs cần Node (stream, zip) — Edge runtime không chạy được. */
export const runtime = "nodejs";

const MAX_FILE_MB = 10;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/**
 * Nhập đối tác từ Excel. Form: file, kieu (moi|cap_nhat), che_do (kiem_tra|nap).
 * Đọc file ở server (bẫy 7); RPC chạy bằng phiên người dùng — RLS chặn thật.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi tải file lên lần nữa.", 401);
  }
  if (!hasPermission(user.role, "edit-catalog")) {
    return errorResponse("Tài khoản không có quyền nhập đối tác", "Chỉ quản lý và văn phòng nhập được đối tác.", 403);
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

  let parsed;
  try {
    parsed = await readPartnerFile(Buffer.from(await file.arrayBuffer()));
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
  if (parsed.rows.length === 0) {
    return errorResponse("File không có dòng dữ liệu", "Điền dữ liệu từ dòng thứ 2 (dòng 1 là tiêu đề cột).", 422);
  }

  try {
    const result = await importPartners(mode, parsed.rows, parsed.issues, commit);
    return Response.json({ result });
  } catch (error) {
    const explained = explainError(error);
    const status =
      explained.kind === "forbidden" ? 403 : explained.kind === "invalid-data" ? 422 : explained.kind === "session-expired" ? 401 : 500;
    return errorResponse(explained.title, explained.action, status);
  }
}
