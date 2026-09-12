import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 đổi tên quy ước `middleware` thành `proxy`. Chạy trước mọi
 * request khớp `config.matcher` bên dưới.
 */
export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);

  // Chặn route theo đăng nhập sẽ bật ở đây khi làm xong màn hình /dang-nhap:
  //
  //   if (!user && !request.nextUrl.pathname.startsWith("/dang-nhap")) {
  //     const url = request.nextUrl.clone();
  //     url.pathname = "/dang-nhap";
  //     url.searchParams.set("tiep_tuc", request.nextUrl.pathname);
  //     return NextResponse.redirect(url);
  //   }
  //
  // `tiep_tuc` giữ lại trang người dùng định vào để đăng nhập xong quay lại
  // đúng chỗ đó.

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
