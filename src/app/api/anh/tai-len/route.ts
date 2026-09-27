import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { fetchProductCode, insertImageRecord } from "@/features/images/api/image.server";
import {
  MAX_FULL_BYTES,
  MAX_THUMB_BYTES,
  detectImageFormat,
  safeFileStem,
} from "@/features/images/lib/image-rules";
import { getImageStorage, ImageStorageError } from "@/features/images/lib/storage/index.server";
import { explainError } from "@/shared/lib/errors";
import { hasPermission } from "@/shared/lib/permissions";

/** Gọi getImageStorage (Apps Script/Drive) — cần Node, không chạy được Edge; hai lượt gọi có thể mất vài giây. */
export const runtime = "nodejs";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi tải ảnh lên lần nữa.", 401);
  }
  if (!hasPermission(user.role, "edit-catalog")) {
    return errorResponse(
      "Tài khoản không có quyền thêm ảnh",
      "Chỉ quản lý và văn phòng thêm được ảnh. Liên hệ quản lý nếu bạn cần quyền.",
      403,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Không đọc được dữ liệu gửi lên", "Tải lại trang rồi thử lại.", 400);
  }

  const productId = form.get("san_pham_id");
  const goc = form.get("goc");
  const nho = form.get("nho");

  if (
    typeof productId !== "string" ||
    !UUID.test(productId) ||
    !(goc instanceof Blob) ||
    !(nho instanceof Blob)
  ) {
    return errorResponse("Thiếu ảnh hoặc mã hàng", "Chọn lại ảnh rồi thử lần nữa.", 400);
  }

  if (goc.size > MAX_FULL_BYTES || nho.size > MAX_THUMB_BYTES) {
    return errorResponse(
      "Ảnh quá lớn sau khi nén",
      "Chụp lại ảnh ít chi tiết hơn rồi thử lại.",
      413,
    );
  }

  const fullBytes = new Uint8Array(await goc.arrayBuffer());
  const thumbBytes = new Uint8Array(await nho.arrayBuffer());

  // WebP từ Chrome/Android; JPEG từ iPhone (WebKit không mã hóa được WebP).
  const fullFormat = detectImageFormat(fullBytes);
  const thumbFormat = detectImageFormat(thumbBytes);
  if (!fullFormat || !thumbFormat) {
    return errorResponse(
      "Ảnh không đúng định dạng",
      "Ảnh phải được nén trong trình duyệt trước khi gửi — tải lại trang rồi thử lại.",
      422,
    );
  }

  let code: string | null;
  try {
    code = await fetchProductCode(productId);
  } catch (e) {
    const explained = explainError(e);
    return errorResponse(explained.title, explained.action, explained.kind === "forbidden" ? 403 : 500);
  }
  if (!code) {
    return errorResponse("Không tìm thấy mã hàng", "Mã có thể đã bị đổi. Tải lại trang.", 404);
  }

  const id = crypto.randomUUID();
  const stem = `${safeFileStem(code)}__${id}`;
  let storage: ReturnType<typeof getImageStorage>;
  try {
    storage = getImageStorage();
  } catch (e) {
    return storageErrorResponse(e);
  }

  let key: string;
  let thumbKey: string;
  try {
    key = await storage.put({
      variant: "full",
      fileName: `${stem}.${fullFormat.extension}`,
      mimeType: fullFormat.mimeType,
      bytes: fullBytes,
    });
  } catch (e) {
    return storageErrorResponse(e);
  }

  try {
    thumbKey = await storage.put({
      variant: "thumb",
      fileName: `${stem}.${thumbFormat.extension}`,
      mimeType: thumbFormat.mimeType,
      bytes: thumbBytes,
    });
  } catch (e) {
    // Bù trừ: ảnh gốc đã lên nơi lưu nhưng thumb lỗi — dọn luôn, không để mồ côi.
    // Lỗi ở bước dọn không quan trọng bằng lỗi gốc đã bắt được, nên bỏ qua.
    await storage.remove(key).catch(() => undefined);
    return storageErrorResponse(e);
  }

  try {
    const result = await insertImageRecord({
      id,
      productId,
      backend: storage.backend,
      key,
      thumbKey,
    });
    return Response.json({ id, isPrimary: result.isPrimary });
  } catch (e) {
    // Bù trừ: DB ghi lỗi sau khi cả hai file đã lên nơi lưu — dọn cả hai, không
    // để file mồ côi. Lỗi ở bước dọn không quan trọng bằng lỗi gốc đã bắt được.
    await storage.remove(key).catch(() => undefined);
    await storage.remove(thumbKey).catch(() => undefined);
    const explained = explainError(e);
    const status =
      explained.kind === "forbidden"
        ? 403
        : explained.kind === "not-found"
          ? 404
          : explained.kind === "invalid-data"
            ? 422
            : 500;
    return errorResponse(explained.title, explained.action, status);
  }
}

function storageErrorResponse(e: unknown): Response {
  if (e instanceof ImageStorageError) {
    if (e.kind === "not_configured") {
      return errorResponse(
        "Server chưa cấu hình nơi lưu ảnh",
        "Báo quản trị khai APPS_SCRIPT_URL và APPS_SCRIPT_SECRET trên server rồi deploy lại.",
        503,
      );
    }
    if (e.kind === "forbidden") {
      return errorResponse(
        "Không lưu được ảnh lên nơi lưu",
        "Khóa bí mật gọi nơi lưu không khớp — báo quản trị kiểm tra cấu hình server.",
        502,
      );
    }
    return errorResponse(
      "Không lưu được ảnh lên nơi lưu",
      "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị kiểm tra Apps Script.",
      502,
    );
  }
  throw e;
}
