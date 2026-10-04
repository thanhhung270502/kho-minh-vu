import type { NextRequest } from "next/server";

import { buildTemplateWorkbook } from "@/features/products/lib/read-catalog-file.server";
import type { ExportRowPayload } from "@/features/products/lib/excel-template";
import { readFilterFromUrl, toListRpcArgs } from "@/features/products/schemas/filter.schema";
import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/** Quá số này thì file nặng và trình duyệt chờ lâu — bắt lọc hẹp lại. */
const MAX_EXPORT_ROWS = 5000;
const DESCRIPTION_BATCH = 150;

function tenFile(): string {
  // Giờ Việt Nam, không phải giờ máy chủ (Vercel chạy UTC).
  const gio = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(/[- :]/g, "");

  return `danh-muc-${gio.slice(0, 8)}-${gio.slice(8, 12)}.xlsx`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      {
        title: "Phiên đăng nhập đã hết hạn",
        action: "Đăng nhập lại rồi xuất Excel.",
      },
      { status: 401 },
    );
  }

  // Xuất đúng những gì đang thấy trên bảng: bộ lọc nằm sẵn trên URL.
  const filter = readFilterFromUrl(request.nextUrl.searchParams);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("danh_sach_san_pham", {
    ...toListRpcArgs(filter),
    p_trang: 1,
    p_kich_thuoc: MAX_EXPORT_ROWS,
  });

  if (error) {
    const explained = explainError(error);
    return Response.json(
      { title: explained.title, action: explained.action },
      { status: explained.kind === "forbidden" ? 403 : 500 },
    );
  }

  const rows = data ?? [];
  const total = Number(rows[0]?.tong_so_dong ?? 0);

  if (total > MAX_EXPORT_ROWS) {
    return Response.json(
      {
        title: `Kết quả có ${total.toLocaleString("vi-VN")} mã`,
        action: `Xuất tối đa ${MAX_EXPORT_ROWS.toLocaleString("vi-VN")} mã một lần — lọc hẹp lại (theo nhóm hàng hoặc xử lý) rồi xuất.`,
      },
      { status: 422 },
    );
  }

  const { data: warehouseRows, error: warehouseError } = await supabase.from("kho").select("id, ten");
  if (warehouseError) {
    const explained = explainError(warehouseError);
    return Response.json({ title: explained.title, action: explained.action }, { status: 500 });
  }

  const warehouseName = new Map((warehouseRows ?? []).map((w) => [w.id, w.ten]));

  // danh_sach_san_pham không trả mo_ta (cột thêm ở 0086, đã grant select theo cột)
  // nên đọc riêng theo id. Lô 150 id để URL của `.in()` không quá dài.
  const ids = rows.map((row) => row.id);
  const descriptionBatches = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / DESCRIPTION_BATCH) }, (_, i) =>
      supabase
        .from("san_pham")
        .select("id, mo_ta")
        .in("id", ids.slice(i * DESCRIPTION_BATCH, (i + 1) * DESCRIPTION_BATCH)),
    ),
  );
  const descriptionError = descriptionBatches.find((batch) => batch.error)?.error;
  if (descriptionError) {
    const explained = explainError(descriptionError);
    return Response.json(
      { title: explained.title, action: explained.action },
      { status: explained.kind === "forbidden" ? 403 : 500 },
    );
  }
  const description = new Map(
    descriptionBatches.flatMap((batch) => (batch.data ?? []).map((p) => [p.id, p.mo_ta] as const)),
  );

  const exportRows: ExportRowPayload[] = rows.map((row, index) => ({
    dong: index + 2,
    ma_hang: row.ma_hang,
    ten_hang: row.ten_hang,
    nhom_hang: row.ten_nhom_hang,
    dvt: row.ten_dvt,
    cong_doan: row.ten_cong_doan,
    quy_doi: row.quy_doi === null ? null : Number(row.quy_doi),
    kho_mac_dinh: row.kho_mac_dinh_id ? (warehouseName.get(row.kho_mac_dinh_id) ?? null) : null,
    ton_toi_thieu: row.ton_toi_thieu === null ? null : Number(row.ton_toi_thieu),
    ton_toi_da: row.ton_toi_da === null ? null : Number(row.ton_toi_da),
    dang_kinh_doanh: row.dang_kinh_doanh,
    mo_ta: description.get(row.id) ?? null,
    tong_ton: row.tong_ton === null ? null : Number(row.tong_ton),
  }));

  const buf = await buildTemplateWorkbook(exportRows);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tenFile()}"`,
      "Cache-Control": "no-store",
    },
  });
}
