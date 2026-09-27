import { revalidateTag } from "next/cache";

import { fetchImageKeys } from "@/features/images/api/image.server";
import { THUMB_PARAM } from "@/features/images/lib/image-url";
import { getImageStorage, ImageStorageError } from "@/features/images/lib/storage/index.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";

/** Gọi getImageStorage (Apps Script/Drive) — cần Node, không chạy được Edge. */
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return errorResponse("Không tìm thấy ảnh", "Ảnh có thể đã bị xóa. Tải lại trang.", 404);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại để xem ảnh.", 401);
  }

  const size =
    new URL(request.url).searchParams.get(THUMB_PARAM.key) === THUMB_PARAM.value ? "thumb" : "full";

  let keys;
  try {
    keys = await fetchImageKeys(id);
  } catch (e) {
    const explained = explainError(e);
    const status = explained.kind === "forbidden" ? 403 : 500;
    return errorResponse(explained.title, explained.action, status);
  }
  if (!keys) {
    return errorResponse("Không tìm thấy ảnh", "Ảnh có thể đã bị xóa. Tải lại trang.", 404);
  }

  const tag = `anh-${id}-${size}`;
  const started = performance.now();

  try {
    const image = await getImageStorage(keys.backend).get(
      size === "thumb" ? keys.thumbKey : keys.key,
      { cacheTag: tag },
    );

    return new Response(Buffer.from(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        // `private`: chặn Vercel Edge giữ ảnh — Edge không phân biệt cookie phiên
        // nên directive cache dùng cho response chia sẻ sẽ lộ ảnh cho người chưa
        // đăng nhập (D-23). `immutable` an toàn vì id là UUID, file không sửa tại chỗ.
        "Cache-Control": "private, max-age=31536000, immutable",
        // Đo ở UAT: lần xem thứ hai dur phải nhỏ hẳn (Data Cache trả, không gọi Apps Script).
        "Server-Timing": `storage;dur=${Math.round(performance.now() - started)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ImageStorageError) {
      // Response ok:false từ Apps Script vẫn là HTTP 200 nên có thể đã vào Data
      // Cache — xóa ngay để lần xem kế tiếp thử lại thay vì kẹt lỗi vĩnh viễn.
      revalidateTag(tag, { expire: 0 });

      if (e.kind === "not_configured") {
        return errorResponse(
          "Server chưa cấu hình nơi lưu ảnh",
          "Báo quản trị khai APPS_SCRIPT_URL và APPS_SCRIPT_SECRET trên server rồi deploy lại.",
          503,
        );
      }
      if (e.kind === "not_found") {
        return errorResponse(
          "Không tìm thấy file ảnh",
          "File có thể đã bị xóa khỏi nơi lưu. Báo quản lý tải lại ảnh cho mã này.",
          404,
        );
      }
      return errorResponse(
        "Không lấy được ảnh từ nơi lưu",
        "Thử tải lại trang sau ít phút. Nếu vẫn lỗi, báo quản trị kiểm tra Apps Script.",
        502,
      );
    }
    throw e;
  }
}
