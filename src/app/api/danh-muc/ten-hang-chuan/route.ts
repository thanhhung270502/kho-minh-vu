import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { loadProductNameSheet } from "@/features/products/api/product-name-sheet.server";

/**
 * Bảng mã → tên từ sheet tên hàng chuẩn, cho ô "Thêm mã hàng" tự điền tên khi gõ mã.
 * Trả nguyên bảng (~8.000 dòng) một lần: tra ngay trên trình duyệt từng phím gõ,
 * không bắn request theo mỗi ký tự. Sheet công khai nên chỉ cần đã đăng nhập.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { title: "Phiên đăng nhập đã hết hạn", action: "Đăng nhập lại rồi thử lần nữa." },
      { status: 401 },
    );
  }

  const sheet = await loadProductNameSheet();
  return Response.json({ names: [...sheet.names], error: sheet.error });
}
