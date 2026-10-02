// File thuần, KHÔNG "use client" — `app/(app)/page.tsx` (Server Component)
// gọi hàm này để chuyển hướng, bẫy 9 nhắc đừng để lẫn "use client" vào đây.
import type { Role } from "@/shared/lib/permissions";

/**
 * Trang chủ theo vai trò (D-11): chỉ quản lý có trang tổng quan thật (`/`),
 * ba vai trò còn lại về thẳng màn việc hằng ngày của họ — văn phòng lên đơn/
 * hóa đơn nhiều nhất nên về `/hoa-don`, thủ kho và chỉ xem tra tồn nhiều nhất
 * nên về `/danh-muc` (trang Tồn kho đã gỡ ở Phase 10). `switch` không có nhánh `default`: TypeScript sẽ
 * báo thiếu case nếu sau này thêm vai trò mới vào enum `vai_tro`.
 */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "quan_ly":
      return "/";
    case "van_phong":
      return "/hoa-don";
    case "thu_kho":
      return "/danh-muc";
    case "chi_xem":
      return "/danh-muc";
  }
}
