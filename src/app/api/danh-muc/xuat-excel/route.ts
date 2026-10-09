import type { NextRequest } from "next/server";
import { z } from "zod";

import { buildTemplateWorkbook } from "@/features/products/lib/read-catalog-file.server";
import type { ExportRowPayload } from "@/features/products/lib/excel-template";
import {
  DEFAULT_PRODUCT_FILTER,
  readFilterFromUrl,
  toListRpcArgs,
  type ProductFilter,
} from "@/features/products/schemas/filter.schema";
import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/** PostgREST trả tối đa 1000 dòng mỗi lần gọi (max_rows) — lấy lần lượt từng trang tới đủ. */
const PAGE_SIZE = 1000;
const DESCRIPTION_BATCH = 150;

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type ListRow = NonNullable<
  Awaited<ReturnType<typeof fetchPage>>["data"]
>[number];

function fetchPage(supabase: Supabase, filter: ProductFilter, page: number) {
  return supabase.rpc("danh_sach_san_pham", {
    ...toListRpcArgs(filter),
    p_trang: page,
    p_kich_thuoc: PAGE_SIZE,
  });
}

/** Mọi mã khớp bộ lọc — không giới hạn số dòng. */
async function fetchAllRows(
  supabase: Supabase,
  filter: ProductFilter,
): Promise<ListRow[]> {
  const rows: ListRow[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await fetchPage(supabase, filter, page);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    const total = Number(batch[0]?.tong_so_dong ?? 0);
    if (batch.length < PAGE_SIZE || rows.length >= total) return rows;
  }
}

function errorResponse(error: unknown): Response {
  const explained = explainError(error);
  return Response.json(
    { title: explained.title, action: explained.action },
    { status: explained.kind === "forbidden" ? 403 : 500 },
  );
}

const sessionExpired = () =>
  Response.json(
    {
      title: "Phiên đăng nhập đã hết hạn",
      action: "Đăng nhập lại rồi xuất Excel.",
    },
    { status: 401 },
  );

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

/** Xuất đúng những gì đang thấy trên bảng: bộ lọc nằm sẵn trên URL. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return sessionExpired();

  const supabase = await createSupabaseServerClient();
  try {
    const rows = await fetchAllRows(
      supabase,
      readFilterFromUrl(request.nextUrl.searchParams),
    );
    return await buildResponse(supabase, rows);
  } catch (error) {
    return errorResponse(error);
  }
}

const selectionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(20000),
});

/** Xuất những mã đã tick — người dùng tick qua nhiều lần tìm, nên không theo bộ lọc nào. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return sessionExpired();

  const parsed = selectionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      {
        title: "Chưa chọn mã nào",
        action: "Tick các mã muốn xuất rồi bấm Xuất Excel.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  try {
    const wanted = new Set(parsed.data.ids);
    const rows = (
      await fetchAllRows(supabase, {
        ...DEFAULT_PRODUCT_FILTER,
        tradingStatus: "all",
      })
    ).filter((row) => wanted.has(row.id));
    return await buildResponse(supabase, rows);
  } catch (error) {
    return errorResponse(error);
  }
}

async function buildResponse(
  supabase: Supabase,
  rows: ListRow[],
): Promise<Response> {
  const { data: warehouseRows, error: warehouseError } = await supabase
    .from("kho")
    .select("id, ten");
  if (warehouseError) return errorResponse(warehouseError);

  const warehouseName = new Map(
    (warehouseRows ?? []).map((w) => [w.id, w.ten]),
  );

  // danh_sach_san_pham không trả mo_ta (cột thêm ở 0086, đã grant select theo cột)
  // nên đọc riêng theo id. Lô 150 id để URL của `.in()` không quá dài.
  const ids = rows.map((row) => row.id);
  const descriptionBatches = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / DESCRIPTION_BATCH) }, (_, i) =>
      supabase
        .from("san_pham")
        .select("id, mo_ta")
        .in(
          "id",
          ids.slice(i * DESCRIPTION_BATCH, (i + 1) * DESCRIPTION_BATCH),
        ),
    ),
  );
  const descriptionError = descriptionBatches.find(
    (batch) => batch.error,
  )?.error;
  if (descriptionError) return errorResponse(descriptionError);
  const description = new Map(
    descriptionBatches.flatMap((batch) =>
      (batch.data ?? []).map((p) => [p.id, p.mo_ta] as const),
    ),
  );

  const exportRows: ExportRowPayload[] = rows.map((row, index) => ({
    dong: index + 2,
    ma_hang: row.ma_hang,
    ten_hang: row.ten_hang,
    nhom_hang: row.ten_nhom_hang,
    dvt: row.ten_dvt,
    cong_doan: row.ten_cong_doan,
    quy_doi: row.quy_doi === null ? null : Number(row.quy_doi),
    kho_mac_dinh: row.kho_mac_dinh_id
      ? (warehouseName.get(row.kho_mac_dinh_id) ?? null)
      : null,
    ton_toi_thieu:
      row.ton_toi_thieu === null ? null : Number(row.ton_toi_thieu),
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
