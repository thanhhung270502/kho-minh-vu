import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { MAX_FILE_MB } from "@/features/products/lib/excel-template";
import {
  readCountFile,
  type CountFileRow,
} from "@/features/stocktake/lib/read-count-file.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import type { Json } from "@/types/database.types";

// exceljs + `node:stream` — không chạy được trên Edge runtime.
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chứng từ vi phạm ràng buộc nghiệp vụ (phiên đã duyệt, mã không thuộc nhóm...). */
const CHECK_VIOLATION_CODE = "23514";

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse(
      "Phiên đăng nhập đã hết hạn",
      "Đăng nhập lại rồi thử lần nữa.",
      401,
    );
  }
  if (user.role === "chi_xem") {
    return errorResponse(
      "Vai trò chỉ xem không nhập số đếm được",
      "Nhờ thủ kho, văn phòng hoặc quản lý thao tác giúp.",
      403,
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const phienField = form.get("phien");
  // Mặc định là xem trước: chỉ đúng chữ "nap" mới ghi số đếm.
  const mode = form.get("che_do") === "nap" ? "nap" : "kiem_tra";
  const phien = typeof phienField === "string" ? phienField.trim() : "";

  if (!UUID_PATTERN.test(phien)) {
    return errorResponse(
      "Phiên kiểm kê không hợp lệ",
      "Tải lại trang rồi thử lại.",
      400,
    );
  }
  if (!(file instanceof File)) {
    return errorResponse(
      "Chưa chọn file",
      "Chọn file đã điền số đếm (.xlsx) rồi thử lại.",
      400,
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return errorResponse(
      "File không phải .xlsx",
      "Dùng đúng file mẫu hệ đã xuất ra, hoặc mở bằng Excel rồi lưu lại thành .xlsx.",
      400,
    );
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return errorResponse(
      `File lớn hơn ${MAX_FILE_MB}MB`,
      "File mẫu đếm thường nhỏ hơn nhiều — kiểm tra có chọn nhầm file không.",
      413,
    );
  }

  let rows: CountFileRow[];
  try {
    rows = await readCountFile(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return errorResponse(
      "Không đọc được file",
      e instanceof Error ? e.message : "Kiểm tra lại file rồi thử lần nữa.",
      422,
    );
  }

  if (rows.length === 0) {
    return errorResponse(
      "File không có dòng hàng nào",
      "Tải lại file mẫu từ phiên này rồi điền số đếm.",
      422,
    );
  }

  // Gọi bằng phiên của chính người dùng (không phải secret key): RPC tự kiểm
  // vai trò và phạm vi kho lần nữa ở database.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("nhap_so_dem_kiem_ke", {
    p_chung_tu_id: phien,
    p_du_lieu: rows as unknown as Json,
    p_chi_kiem_tra: mode !== "nap",
  });

  if (error) {
    const explained = explainError(error);
    if (explained.kind === "forbidden") {
      return errorResponse(explained.title, explained.action, 403);
    }
    if (explained.kind === "session-expired") {
      return errorResponse(explained.title, explained.action, 401);
    }
    if (errorCode(error) === CHECK_VIOLATION_CODE) {
      return errorResponse(
        "Không nhập được số đếm",
        isPostgrestError(error) ? error.message : explained.action,
        409,
      );
    }
    return errorResponse(explained.title, explained.action, 500);
  }

  // Giữ khóa `result` như route nạp tồn tạm — client đọc đúng khóa này.
  return Response.json({ result: data });
}
