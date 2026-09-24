import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { buildCountTemplate } from "@/features/stocktake/lib/count-template.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError, type ExplainedError } from "@/shared/lib/errors";
import { removeDiacritics } from "@/shared/lib/text";

// exceljs — không chạy được trên Edge runtime.
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/** RPC dùng chung một khuôn mã lỗi (forbidden/session-expired/invalid-data). */
function statusFor(explained: ExplainedError): number {
  if (explained.kind === "session-expired") return 401;
  if (explained.kind === "forbidden") return 403;
  if (explained.kind === "invalid-data" || explained.kind === "not-found") return 404;
  return 500;
}

/** Tên file không dấu, an toàn cho mọi hệ điều hành. */
function slugify(value: string): string {
  return (
    removeDiacritics(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "nhom"
  );
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse(
      "Phiên đăng nhập đã hết hạn",
      "Đăng nhập lại rồi tải file mẫu.",
      401,
    );
  }

  const phien = request.nextUrl.searchParams.get("phien") ?? "";
  const nhomRaw = request.nextUrl.searchParams.get("nhom");
  const nhom = nhomRaw?.trim() ? nhomRaw.trim() : null;

  if (!UUID_PATTERN.test(phien)) {
    return errorResponse(
      "Phiên kiểm kê không hợp lệ",
      "Tải lại trang rồi thử lại.",
      400,
    );
  }
  if (nhom !== null && !UUID_PATTERN.test(nhom)) {
    return errorResponse(
      "Nhóm hàng không hợp lệ",
      "Tải lại trang rồi chọn lại nhóm.",
      400,
    );
  }

  const supabase = await createSupabaseServerClient();

  // Lấy đầu phiên (số chứng từ, tên kho) để in vào sheet Hướng dẫn.
  const { data: sessionRows, error: sessionError } = await supabase.rpc(
    "danh_sach_phien_kiem_ke",
    { p_chung_tu_id: phien },
  );
  if (sessionError) {
    const explained = explainError(sessionError);
    return errorResponse(explained.title, explained.action, statusFor(explained));
  }
  const session = sessionRows?.[0];
  if (!session) {
    return errorResponse(
      "Không tìm thấy phiên kiểm kê",
      "Phiên có thể đã bị xóa, hoặc không thuộc kho bạn được phân quyền.",
      404,
    );
  }

  const { data, error } = await supabase.rpc("bang_dem_kiem_ke", {
    p_chung_tu_id: phien,
    p_nhom_hang_id: nhom ?? undefined,
  });

  if (error) {
    const explained = explainError(error);
    return errorResponse(explained.title, explained.action, statusFor(explained));
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return errorResponse(
      "Nhóm này không có mã nào trong phạm vi phiên",
      "Chọn nhóm khác hoặc kiểm tra lại phạm vi phiên kiểm kê.",
      404,
    );
  }

  // Nhóm đã lọc thì mọi dòng cùng ten_nhom — lấy từ dòng đầu, không truy vấn
  // thêm bảng nhom_hang.
  const categoryName = nhom ? (rows[0].ten_nhom ?? null) : null;

  // CHỈ ghi mã/tên/ĐVT vào file — KHÔNG đọc/ghi cột số liệu hệ thống nào (D-08).
  const buf = await buildCountTemplate(
    rows.map((row) => ({
      code: row.ma_hang,
      name: row.ten_hang,
      unit: row.ten_dvt,
    })),
    {
      sessionNo: session.so_ct,
      warehouseName: session.ten_kho,
      categoryName,
    },
  );

  const tenNhom = categoryName ? slugify(categoryName) : "toan-kho";
  const fileName = `dem-${session.so_ct}-${tenNhom}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
