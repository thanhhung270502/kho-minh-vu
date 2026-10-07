// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Icon để dạng mã chuỗi (NavIconId), ánh xạ sang element ở nav-icons.tsx
// (file client) — cách chắc chắn để Server Component vẫn import được từ đây.
import {
  allows,
  type AnyPermission,
  type PermissionSubject,
} from "@/shared/lib/permissions";

export type NavIconId =
  | "dashboard"
  | "stock-in"
  | "sales-order"
  | "stock-out"
  | "catalog"
  | "partners"
  | "settings"
  | "stocktake"
  | "analytics"
  | "orders"
  | "goods";

/** Nhóm menu cấp 1 (Phase 10, GON-04) — chỉ là lớp hiển thị trên danh sách phẳng. */
export type NavGroupId = "orders" | "goods";

export type NavItem = {
  /** Đường dẫn giữ tiếng Việt: URL là bề mặt người dùng nhìn thấy. */
  href: string;
  label: string;
  /** Nhãn ngắn cho thanh tab đáy — chỗ hẹp, tối đa ~8 ký tự. */
  shortLabel: string;
  icon: NavIconId;
  /** Mảng = hiện khi có một trong các quyền. */
  permission: AnyPermission | readonly AnyPermission[];
  /** null = không vào thanh tab đáy, nằm trong mục "Khác". */
  mobilePriority: number | null;
  /** Thuộc nhóm nào trên menu máy tính; thanh tab đáy vẫn dùng danh sách phẳng. */
  group?: NavGroupId;
};

export const NAV_GROUPS: Record<
  NavGroupId,
  { label: string; icon: NavIconId }
> = {
  orders: { label: "Đơn hàng", icon: "orders" },
  goods: { label: "Hàng hóa", icon: "goods" },
};

// mobilePriority: thanh tab đáy chỉ có 4 ô chính — chỗ thủ kho cầm điện thoại
// dùng nhiều nhất. ~92 hóa đơn/ngày so với ~8 phiếu nhập/ngày (CLAUDE.md) nên
// "Duyệt đơn" đứng trước "Nhập kho". Phase 10 gỡ trang Tồn kho: tra tồn nay ở
// Danh sách hàng hóa, nên mục đó lấy ô thứ 4 mà "Tồn kho" để lại.
//
// Thứ tự mảng là thứ tự menu máy tính; nhóm đứng ở vị trí mục con đầu tiên.
export const NAV_ITEMS: NavItem[] = [
  {
    // Quyền "view-dashboard" (D-11) — CHỈ quản lý, khác mọi mục còn lại của
    // menu này. Ba vai trò kia không có trang tổng quan, mục này ẩn hẳn khỏi
    // menu của họ (không chỉ disable) và không chiếm ô nào của thanh tab đáy.
    href: "/",
    label: "Tổng quan",
    shortLabel: "Tổng quan",
    icon: "dashboard",
    permission: "xem_dashboard",
    mobilePriority: 1,
  },
  {
    href: "/danh-muc",
    label: "Danh sách hàng hóa",
    shortLabel: "Hàng",
    icon: "catalog",
    permission: "view-catalog",
    mobilePriority: 4,
    group: "goods",
  },
  {
    // Kiểm kê định kỳ, không phải việc hằng giờ như xuất/nhập nên không chiếm
    // ô nào của thanh tab đáy — vào bằng "Khác" (D-04).
    href: "/kiem-ke",
    label: "Kiểm kho",
    shortLabel: "Kiểm kho",
    icon: "stocktake",
    permission: "view-catalog",
    mobilePriority: null,
    group: "goods",
  },
  {
    href: "/don-dat",
    label: "Đơn đặt",
    shortLabel: "Đơn đặt",
    icon: "sales-order",
    permission: "view-catalog",
    mobilePriority: 5,
    group: "orders",
  },
  {
    // "Xuất kho" → "Hóa đơn" (Phase 10) → "Duyệt đơn" (Phase 17) — vẫn là chứng từ XUAT.
    href: "/duyet-don",
    label: "Duyệt đơn",
    shortLabel: "Duyệt đơn",
    icon: "stock-out",
    permission: "view-catalog",
    mobilePriority: 2,
    group: "orders",
  },
  {
    href: "/nhap-hang",
    label: "Nhập hàng",
    shortLabel: "Nhập hàng",
    icon: "stock-in",
    permission: "view-catalog",
    mobilePriority: 3,
  },
  {
    href: "/doi-tac",
    label: "Đối tác",
    shortLabel: "Đối tác",
    icon: "partners",
    permission: "view-catalog",
    mobilePriority: null,
  },
  {
    // Phase 13 — việc định kỳ của văn phòng/quản lý, không chiếm ô tab đáy.
    href: "/phan-tich",
    label: "Phân tích",
    shortLabel: "Phân tích",
    icon: "analytics",
    permission: "xem_phan_tich",
    mobilePriority: null,
  },
  {
    href: "/cai-dat",
    label: "Cài đặt",
    shortLabel: "Cài đặt",
    icon: "settings",
    // Cài đặt: Admin, hoặc người có quyền Tạo tài khoản / Phân quyền (tab Người dùng).
    permission: ["manage-users", "tao_tai_khoan", "phan_quyen"],
    // Thủ kho hiếm dùng, đẩy vào "Khác" thay vì chiếm một ô của thanh tab đáy.
    mobilePriority: null,
  },
];

export type NavEntry =
  | { kind: "item"; key: string; label: string; item: NavItem }
  | {
      kind: "group";
      key: NavGroupId;
      label: string;
      icon: NavIconId;
      items: NavItem[];
    };

/**
 * Gộp các mục cùng `group` thành một mục cấp 1 cho menu máy tính. Nhận danh
 * sách ĐÃ lọc quyền nên nhóm chỉ chứa mục người đó được thấy; nhóm rỗng tự biến mất.
 */
export function buildNavEntries(items: NavItem[]): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const item of items) {
    if (!item.group) {
      entries.push({ kind: "item", key: item.href, label: item.label, item });
      continue;
    }
    const existing = entries.find(
      (e) => e.kind === "group" && e.key === item.group,
    );
    if (existing?.kind === "group") {
      existing.items.push(item);
    } else {
      const { label, icon } = NAV_GROUPS[item.group];
      entries.push({
        kind: "group",
        key: item.group,
        label,
        icon,
        items: [item],
      });
    }
  }
  return entries;
}

/** "/" chỉ khớp chính nó; các mục khác khớp cả route con. */
export function findActiveHref(pathname: string, items: NavItem[]): string {
  const matched = items.filter(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );

  return matched.at(-1)?.href ?? "/";
}

/** D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable. */
export function filterNavItems(
  user: PermissionSubject,
  items: NavItem[],
): NavItem[] {
  return items.filter((item) => allows(user, item.permission));
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
    .sort(
      (a, b) => (a.mobilePriority as number) - (b.mobilePriority as number),
    );

  const primary = prioritized.slice(0, 4);
  const primaryHrefs = new Set(primary.map((item) => item.href));
  const overflow = items.filter((item) => !primaryHrefs.has(item.href));

  return { primary, overflow };
}

/**
 * Tailwind không sinh được class động `grid-cols-${n}` — thanh tab đáy dùng
 * số này để đặt `style={{ gridTemplateColumns: repeat(n, minmax(0,1fr)) }}`.
 */
export function bottomTabColumns(
  primary: NavItem[],
  overflow: NavItem[],
): number {
  return primary.length + (overflow.length > 0 ? 1 : 0);
}
