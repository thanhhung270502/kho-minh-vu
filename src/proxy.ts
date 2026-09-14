import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { tiepTucAnToan } from "@/shared/lib/tiep-tuc";

const DUONG_CONG_KHAI = ["/dang-nhap"];

/** Chép cookie phiên vừa làm mới sang response redirect, không thì phiên vừa refresh sẽ mất. */
function chuyenHuong(url: URL, response: NextResponse): NextResponse {
  const r = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

/**
 * Next.js 16 đổi tên quy ước `middleware` thành `proxy`. Chạy trước mọi
 * request khớp `config.matcher` bên dưới.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const laCongKhai = DUONG_CONG_KHAI.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { loai: "het-phien", thongBao: "Phiên đăng nhập đã hết hạn" },
      { status: 401 },
    );
  }

  if (!user && !laCongKhai) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.search = "";
    url.searchParams.set("tiep_tuc", tiepTucAnToan(`${pathname}${search}`));
    return chuyenHuong(url, response);
  }

  if (user && pathname === "/dang-nhap") {
    const dich = tiepTucAnToan(request.nextUrl.searchParams.get("tiep_tuc"));
    return chuyenHuong(new URL(dich, request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Chạy trên mọi đường dẫn trừ file tĩnh và ảnh — đụng vào request tĩnh
     * chỉ tốn thời gian, không có phiên nào để làm mới.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
