import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { softDeleteImage } from "@/features/images/api/image.server";
import { getImageStorage } from "@/features/images/lib/storage/index.server";
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
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi thử lại.", 401);
  }
  if (!hasPermission(user.role, "edit-catalog")) {
    return errorResponse(
      "Tài khoản không có quyền xóa ảnh",
      "Chỉ quản lý và văn phòng xóa được ảnh. Liên hệ quản lý nếu bạn cần quyền.",
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Thiếu ảnh cần xóa", "Tải lại trang rồi thử lại.", 400);
  }

  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !UUID.test(id)) {
    return errorResponse("Thiếu ảnh cần xóa", "Tải lại trang rồi thử lại.", 400);
  }

  let keys;
  try {
    keys = await softDeleteImage(id);
  } catch (e) {
    const explained = explainError(e);
    return errorResponse(explained.title, explained.action, explained.kind === "forbidden" ? 403 : 500);
  }
  if (!keys) {
    return errorResponse(
      "Ảnh không tồn tại hoặc đã bị xóa",
      "Tải lại trang để thấy danh sách mới.",
      404,
    );
  }

  // DB đã xóa mềm — với người dùng đây đã là thành công (ảnh biến mất khỏi
  // danh sách ngay, /anh/<id> đọc qua RPC lay_khoa_anh cũng đã không thấy
  // ảnh này, không cần revalidateTag riêng). Chuyển file Drive vào thùng rác
  // là dọn dẹp thêm — lỗi ở bước này không hồi lại bản ghi đã xóa (D-21), chỉ
  // báo thật cho người dùng biết qua driveTrashed thay vì nuốt im lặng.
  let storage: ReturnType<typeof getImageStorage>;
  try {
    storage = getImageStorage(keys.backend);
  } catch {
    // Server chưa cấu hình nơi lưu: bản ghi đã xóa mềm, chỉ file chưa vào thùng rác.
    return Response.json({ driveTrashed: false });
  }
  const [full, thumb] = await Promise.allSettled([
    storage.remove(keys.key),
    storage.remove(keys.thumbKey),
  ]);
  const driveTrashed = full.status === "fulfilled" && thumb.status === "fulfilled";

  return Response.json({ driveTrashed });
}
