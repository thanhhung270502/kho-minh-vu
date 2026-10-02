import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { MAX_FILE_MB } from "@/features/products/lib/excel-template";
import { readNewProductFile } from "@/features/products/lib/read-new-product-file.server";
import { can } from "@/shared/lib/permissions";

/** exceljs cần Node (stream, zip) — Edge runtime không chạy được. */
export const runtime = "nodejs";

const MAX_ROWS = 10_000;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/**
 * Chỉ ĐỌC file rồi trả các dòng về client (bẫy 7: đọc Excel chỉ ở server).
 * Chọn trường, kiểm trùng và nạp diễn ra sau, qua RPC nhap_ma_hang_moi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi tải file lên lần nữa.", 401);
  }
  if (!can(user, "tao_ma_hang")) {
    return errorResponse(
      "Tài khoản không có quyền nhập mã hàng",
      "Chỉ quản lý và văn phòng nhập được mã hàng. Liên hệ quản lý nếu bạn cần quyền.",
      403,
    );
  }

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    return errorResponse("Chưa chọn file", "Chọn một file Excel (.xlsx) rồi thử lại.", 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return errorResponse(
      "File không phải .xlsx",
      "Mở file bằng Excel rồi Lưu thành định dạng .xlsx, sau đó tải lại.",
      400,
    );
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return errorResponse(`File lớn hơn ${MAX_FILE_MB}MB`, "Chia nhỏ file rồi nhập từng phần.", 413);
  }

  let rows;
  try {
    rows = await readNewProductFile(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return errorResponse(
      "Không đọc được file",
      e instanceof Error ? e.message : "Kiểm tra lại file rồi thử lần nữa.",
      422,
    );
  }
  if (rows.length === 0) {
    return errorResponse("File không có dòng nào", "Điền mã hàng từ dòng 2 trở đi rồi tải lại.", 422);
  }
  if (rows.length > MAX_ROWS) {
    return errorResponse("File quá 10.000 dòng", "Chia nhỏ file rồi nhập từng phần.", 413);
  }

  return Response.json({ rows });
}
