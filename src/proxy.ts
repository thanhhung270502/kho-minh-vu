import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { safeRedirectPath } from "@/shared/lib/redirect-path";

const PUBLIC_PATHS = ["/dang-nhap"];

/** Chép cookie phiên vừa làm mới sang response redirect, không thì phiên vừa refresh sẽ mất. */
function redirectWithCookies(url: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/**
 * Next.js 16 đổi tên quy ước `middleware` thành `proxy`. Chạy trước mọi
 * request khớp `config.matcher` bên dưới.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { kind: "session-expired", message: "Phiên đăng nhập đã hết hạn" },
      { status: 401 },
    );
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.search = "";
    // Tên tham số `tiep_tuc` giữ tiếng Việt: nó hiện trên thanh địa chỉ.
    url.searchParams.set("tiep_tuc", safeRedirectPath(`${pathname}${search}`));
    return redirectWithCookies(url, response);
  }

  if (user && pathname === "/dang-nhap") {
    const target = safeRedirectPath(request.nextUrl.searchParams.get("tiep_tuc"));
    return redirectWithCookies(new URL(target, request.url), response);
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
