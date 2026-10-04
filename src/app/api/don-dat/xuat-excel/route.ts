import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { buildOrderWorkbook } from "@/features/sales-order/lib/order-workbook.server";
import {
  readOrderFilterFromUrl,
  toOrderListRpcArgs,
} from "@/features/sales-order/schemas/order.schema";
import { toOrderRow, type OrderRow } from "@/features/sales-order/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";

export const runtime = "nodejs";

/** Quá số này thì file nặng và trình duyệt chờ lâu — bắt lọc hẹp lại. */
const MAX_EXPORT_ROWS = 2000;
const PAGE = 200;

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

  return `don-dat-${gio.slice(0, 8)}-${gio.slice(8, 12)}.xlsx`;
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

  // Xuất đúng những gì đang lọc — bộ lọc nằm sẵn trên URL; trang 200 vì RPC kẹp (P4).
  const filter = readOrderFilterFromUrl(request.nextUrl.searchParams);
  const supabase = await createSupabaseServerClient();

  const fetchPage = async (page: number) =>
    supabase.rpc("danh_sach_don", {
      ...toOrderListRpcArgs({ ...filter, page }),
      p_kich_thuoc: PAGE,
    });

  const fail = (error: unknown) => {
    const explained = explainError(error);
    return Response.json(
      { title: explained.title, action: explained.action },
      { status: explained.kind === "forbidden" ? 403 : 500 },
    );
  };

  const first = await fetchPage(1);
  if (first.error) return fail(first.error);

  const firstRows = first.data ?? [];
  const total = Number(firstRows[0]?.tong_so_dong ?? 0);

  if (total > MAX_EXPORT_ROWS) {
    return Response.json(
      {
        title: `Kết quả có ${total.toLocaleString("vi-VN")} đơn`,
        action:
          "Xuất tối đa 2.000 đơn một lần — lọc hẹp lại (khoảng ngày, trạng thái) rồi xuất.",
      },
      { status: 422 },
    );
  }

  const rows: OrderRow[] = firstRows.map(toOrderRow);
  const pages = Math.ceil(total / PAGE);
  for (let page = 2; page <= pages; page++) {
    const next = await fetchPage(page);
    if (next.error) return fail(next.error);
    rows.push(...(next.data ?? []).map(toOrderRow));
  }

  const buf = await buildOrderWorkbook(rows);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tenFile()}"`,
      "Cache-Control": "no-store",
    },
  });
}
