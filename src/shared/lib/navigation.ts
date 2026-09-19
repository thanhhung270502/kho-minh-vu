// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Icon để dạng mã chuỗi (NavIconId), ánh xạ sang element ở nav-icons.tsx
// (file client) — cách chắc chắn để Server Component vẫn import được từ đây.
import { hasPermission, type Permission, type Role } from "@/shared/lib/permissions";

export type NavIconId = "dashboard" | "stock-in" | "catalog" | "partners" | "settings";

export type NavItem = {
  /** Đường dẫn giữ tiếng Việt: URL là bề mặt người dùng nhìn thấy. */
  href: string;
  label: string;
  /** Nhãn ngắn cho thanh tab đáy — chỗ hẹp, tối đa ~8 ký tự. */
  shortLabel: string;
  icon: NavIconId;
  permission: Permission;
  /** null = không vào thanh tab đáy, nằm trong mục "Khác". */
  mobilePriority: number | null;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Tổng quan",
    shortLabel: "Tổng quan",
    icon: "dashboard",
    permission: "view-catalog",
    mobilePriority: 1,
  },
  {
    // Nghiệp vụ hằng ngày đứng trước dữ liệu nền.
    href: "/nhap-kho",
    label: "Nhập kho",
    shortLabel: "Nhập",
    icon: "stock-in",
    permission: "view-catalog",
    mobilePriority: 2,
  },
  {
    href: "/danh-muc",
    label: "Danh mục hàng",
    shortLabel: "Hàng",
    icon: "catalog",
    permission: "view-catalog",
    mobilePriority: 3,
  },
  {
    href: "/doi-tac",
    label: "Đối tác",
    shortLabel: "Đối tác",
    icon: "partners",
    permission: "view-catalog",
    mobilePriority: 4,
  },
  {
    href: "/cai-dat",
    label: "Cài đặt",
    shortLabel: "Cài đặt",
    icon: "settings",
    permission: "manage-lookups",
    // Thủ kho hiếm dùng, đẩy vào "Khác" thay vì chiếm một ô của thanh tab đáy.
    mobilePriority: null,
  },
];

/** "/" chỉ khớp chính nó; các mục khác khớp cả route con. */
export function findActiveHref(pathname: string, items: NavItem[]): string {
  const matched = items.filter(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );

  return matched.at(-1)?.href ?? "/";
}

/** D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable. */
export function filterByPermission(role: Role, items: NavItem[]): NavItem[] {
  return items.filter((item) => hasPermission(role, item.permission));
}

/**
 * Tách mục cho thanh tab đáy: tối đa 4 ô chính (sắp theo mobilePriority tăng
 * dần), phần còn lại — kể cả mục bị cắt vì quá 4 — rơi vào "Khác".
 */
export function splitMobileItems(items: NavItem[]): {
  primary: NavItem[];
  overflow: NavItem[];
} {
  const prioritized = items
    .filter((item) => item.mobilePriority !== null)
    .sort((a, b) => (a.mobilePriority as number) - (b.mobilePriority as number));

  const primary = prioritized.slice(0, 4);
  const primaryHrefs = new Set(primary.map((item) => item.href));
  const overflow = items.filter((item) => !primaryHrefs.has(item.href));

  return { primary, overflow };
}

/**
 * Tailwind không sinh được class động `grid-cols-${n}` — thanh tab đáy dùng
 * số này để đặt `style={{ gridTemplateColumns: repeat(n, minmax(0,1fr)) }}`.
 */
export function bottomTabColumns(primary: NavItem[], overflow: NavItem[]): number {
  return primary.length + (overflow.length > 0 ? 1 : 0);
}
