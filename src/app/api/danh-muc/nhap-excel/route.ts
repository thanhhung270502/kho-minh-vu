import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { docFileDanhMuc } from "@/features/danh-muc/lib/doc-file-danh-muc.server";
import { GIOI_HAN_FILE_MB } from "@/features/danh-muc/lib/mau-excel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";
import { hasPermission } from "@/shared/lib/permissions";
import type { Json } from "@/types/database.types";

/** exceljs cần Node (stream, zip) — Edge runtime không chạy được. */
export const runtime = "nodejs";

function loi(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

export async function POST(request: Request) {
  const nd = await getCurrentUser();
  if (!nd) {
    return loi("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi tải file lên lần nữa.", 401);
  }
  if (!hasPermission(nd.role, "edit-catalog")) {
    return loi(
      "Tài khoản không có quyền nhập danh mục",
      "Chỉ quản lý và văn phòng nhập được danh mục. Liên hệ quản lý nếu bạn cần quyền.",
      403,
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const cheDo = form.get("che_do") === "nap" ? "nap" : "kiem_tra";

  if (!(file instanceof File)) {
    return loi("Chưa chọn file", "Chọn một file Excel (.xlsx) rồi thử lại.", 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return loi(
      "File không phải .xlsx",
      "Mở file bằng Excel rồi Lưu thành định dạng .xlsx, sau đó tải lại.",
      400,
    );
  }
  if (file.size > GIOI_HAN_FILE_MB * 1024 * 1024) {
    return loi(
      `File lớn hơn ${GIOI_HAN_FILE_MB}MB`,
      "Chia nhỏ file rồi nhập từng phần.",
      413,
    );
  }

  let doc;
  try {
    doc = await docFileDanhMuc(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return loi(
      "Không đọc được file",
      e instanceof Error ? e.message : "Kiểm tra lại file rồi thử lần nữa.",
      422,
    );
  }

  // Gọi bằng phiên của chính người dùng: RLS, quyền theo cột và trigger giá bán
  // đều áp như khi họ sửa tay, và nhật ký ghi đúng người.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("nhap_danh_muc", {
    p_dong: doc.dong as unknown as Json,
    p_chi_kiem_tra: cheDo !== "nap",
  });

  if (error) {
    const dien = explainError(error);
    const status =
      dien.kind === "forbidden" ? 403 : dien.kind === "invalid-data" ? 422 : 500;
    return loi(dien.title, dien.action, status);
  }

  return Response.json({ dinhDang: doc.dinhDang, ketQua: data });
}
