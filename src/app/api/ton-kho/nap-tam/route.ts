import { getCurrentUser } from "@/features/auth/api/current-user.server";
import {
  findDuplicateCodes,
  readStockFile,
  type ProvisionalStockRow,
} from "@/features/inventory/lib/read-stock-file.server";
import { MAX_FILE_MB } from "@/features/products/lib/excel-template";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";
import type { Json } from "@/types/database.types";

// exceljs + `node:stream` — không chạy được trên Edge runtime.
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Số mã lặp liệt kê trong câu lỗi — đủ để người dùng tìm trong Excel, không tràn màn hình. */
const DUPLICATE_PREVIEW_LIMIT = 10;

const MANAGER_ONLY = {
  title: "Chỉ quản lý nạp được tồn tạm",
  action:
    "Số nạp ở đây đổi tồn của mọi mã và mọi báo cáo tồn kho. Nhờ quản lý thao tác giúp.",
};

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/** Lớp chặn thứ nhất. Lớp thật là RPC `nap_ton_tam` tự kiểm vai trò (42501). */
async function requireManager() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse(
      "Phiên đăng nhập đã hết hạn",
      "Đăng nhập lại rồi thử lần nữa.",
      401,
    );
  }
  if (user.role !== "quan_ly") {
    return errorResponse(MANAGER_ONLY.title, MANAGER_ONLY.action, 403);
  }
  return null;
}

export async function POST(request: Request) {
  const blocked = await requireManager();
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get("file");
  // Mặc định là xem trước: chỉ đúng chữ "nap" mới ghi sổ.
  const mode = form.get("che_do") === "nap" ? "nap" : "kiem_tra";
  const warehouseField = form.get("kho_mac_dinh");
  const warehouseId =
    typeof warehouseField === "string" ? warehouseField.trim() : "";

  if (!(file instanceof File)) {
    return errorResponse(
      "Chưa chọn file",
      "Chọn file danh mục KiotViet (.xlsx) rồi thử lại.",
      400,
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return errorResponse(
      "File không phải .xlsx",
      "Dùng đúng file KiotViet xuất ra, hoặc mở bằng Excel rồi lưu lại thành .xlsx.",
      400,
    );
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return errorResponse(
      `File lớn hơn ${MAX_FILE_MB}MB`,
      "File danh mục KiotViet thường nhỏ hơn nhiều — kiểm tra có chọn nhầm file không.",
      413,
    );
  }
  if (warehouseId !== "" && !UUID_PATTERN.test(warehouseId)) {
    return errorResponse(
      "Kho áp dụng không hợp lệ",
      "Tải lại trang rồi chọn lại kho áp dụng.",
      400,
    );
  }

  let rows: ProvisionalStockRow[];
  try {
    rows = await readStockFile(Buffer.from(await file.arrayBuffer()));
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
      "Xuất lại danh mục hàng hóa từ KiotViet rồi tải lên file mới.",
      422,
    );
  }

  const duplicates = findDuplicateCodes(rows);
  if (duplicates.length > 0) {
    const shown = duplicates.slice(0, DUPLICATE_PREVIEW_LIMIT).join(", ");
    const more =
      duplicates.length > DUPLICATE_PREVIEW_LIMIT
        ? ` và ${duplicates.length - DUPLICATE_PREVIEW_LIMIT} mã khác`
        : "";
    return errorResponse(
      `File có ${duplicates.length} mã hàng lặp lại`,
      `Mỗi mã chỉ được một dòng, nạp cả hai sẽ cộng đôi tồn. Mã lặp: ${shown}${more}. Sửa file rồi tải lại.`,
      422,
    );
  }

  // Gọi bằng phiên của chính người dùng (không phải secret key): RPC tự kiểm vai
  // trò lần nữa ở database.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("nap_ton_tam", {
    p_du_lieu: rows as unknown as Json,
    p_kho_mac_dinh: warehouseId || undefined,
    p_chi_kiem_tra: mode !== "nap",
  });

  if (error) {
    const explained = explainError(error);
    if (explained.kind === "forbidden") {
      return errorResponse(MANAGER_ONLY.title, MANAGER_ONLY.action, 403);
    }
    return errorResponse(
      explained.title,
      explained.action,
      explained.kind === "session-expired" ? 401 : 500,
    );
  }

  return Response.json({ result: data });
}
