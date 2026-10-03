// File thuần, KHÔNG "use client" — `app/(app)/page.tsx` (Server Component)
// gọi hàm này để chuyển hướng, bẫy 9 nhắc đừng để lẫn "use client" vào đây.
import { can, type PermissionSubject } from "@/shared/lib/permissions";

/**
 * Trang chủ: có quyền "Xem dashboard" (chức vụ, Phase 16) thì là `/`. Không có
 * thì về màn việc hằng ngày theo phạm vi — quản lý / văn phòng lên đơn, hóa
 * đơn nhiều nhất nên về `/duyet-don` (Duyệt đơn); thủ kho và chỉ xem tra tồn nên về
 * `/danh-muc`. Không bao giờ trả `/` cho người không xem được dashboard —
 * `app/(app)/page.tsx` sẽ chuyển hướng vòng tròn. `switch` không có `default`:
 * TypeScript báo thiếu case nếu enum `vai_tro` thêm giá trị.
 */
export function homePathFor(user: PermissionSubject): string {
  if (can(user, "xem_dashboard")) return "/";
  switch (user.role) {
    case "quan_ly":
    case "van_phong":
      return "/duyet-don";
    case "thu_kho":
    case "chi_xem":
      return "/danh-muc";
  }
}
