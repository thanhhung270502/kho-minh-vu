import type { NextRequest } from "next/server";

import { taoFileMau } from "@/features/danh-muc/lib/doc-file-danh-muc.server";
import type { DongXuat } from "@/features/danh-muc/lib/mau-excel";
import { docBoLocTuUrl, thamSoRpc } from "@/features/danh-muc/schemas/bo-loc.schema";
import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainError } from "@/shared/lib/errors";
import { hasPermission } from "@/shared/lib/permissions";

export const runtime = "nodejs";

/** Quá số này thì file nặng và trình duyệt chờ lâu — bắt lọc hẹp lại. */
const TOI_DA = 5000;

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
  const nd = await getCurrentUser();
  if (!nd) {
    return Response.json(
      {
        title: "Phiên đăng nhập đã hết hạn",
        action: "Đăng nhập lại rồi xuất Excel.",
      },
      { status: 401 },
    );
  }

  // Xuất đúng những gì đang thấy trên bảng: bộ lọc nằm sẵn trên URL.
  const boLoc = docBoLocTuUrl(request.nextUrl.searchParams);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("danh_sach_san_pham", {
    ...thamSoRpc(boLoc),
    p_trang: 1,
    p_kich_thuoc: TOI_DA,
  });

  if (error) {
    const loi = explainError(error);
    return Response.json(
      { title: loi.title, action: loi.action },
      { status: loi.kind === "forbidden" ? 403 : 500 },
    );
  }

  const dong = data ?? [];
  const tong = Number(dong[0]?.tong_so_dong ?? 0);

  if (tong > TOI_DA) {
    return Response.json(
      {
        title: `Kết quả có ${tong.toLocaleString("vi-VN")} mã`,
        action: `Xuất tối đa ${TOI_DA.toLocaleString("vi-VN")} mã một lần — lọc hẹp lại (theo nhóm hàng hoặc công đoạn) rồi xuất.`,
      },
      { status: 422 },
    );
  }

  const { data: kho, error: loiKho } = await supabase.from("kho").select("id, ten");
  if (loiKho) {
    const loi = explainError(loiKho);
    return Response.json({ title: loi.title, action: loi.action }, { status: 500 });
  }

  const tenKho = new Map((kho ?? []).map((k) => [k.id, k.ten]));
  const coGiaVon = hasPermission(nd.role, "view-cost");

  const dongXuat: DongXuat[] = dong.map((d, i) => ({
    dong: i + 2,
    ma_hang: d.ma_hang,
    ten_hang: d.ten_hang,
    nhom_hang: d.ten_nhom_hang,
    dvt: d.ten_dvt,
    cong_doan: d.ten_cong_doan,
    quy_doi: d.quy_doi === null ? null : Number(d.quy_doi),
    kho_mac_dinh: d.kho_mac_dinh_id ? (tenKho.get(d.kho_mac_dinh_id) ?? null) : null,
    ton_toi_thieu: d.ton_toi_thieu === null ? null : Number(d.ton_toi_thieu),
    ton_toi_da: d.ton_toi_da === null ? null : Number(d.ton_toi_da),
    gia_ban: d.gia_ban === null ? null : Number(d.gia_ban),
    dang_kinh_doanh: d.dang_kinh_doanh,
    ghi_chu: null,
    tong_ton: d.tong_ton === null ? null : Number(d.tong_ton),
    // Cột giá vốn chỉ có mặt khi được phép xem; RPC cũng đã trả null cho vai trò khác.
    gia_von: coGiaVon && d.gia_von !== null ? Number(d.gia_von) : null,
  }));

  const buf = await taoFileMau(dongXuat, { coGiaVon });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tenFile()}"`,
      "Cache-Control": "no-store",
    },
  });
}
