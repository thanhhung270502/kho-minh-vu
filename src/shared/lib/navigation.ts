// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Icon để dạng mã chuỗi (NavIconId), ánh xạ sang element ở nav-icons.tsx
// (file client) — cách chắc chắn để Server Component vẫn import được từ đây.
import {
  hasPermission,
  type Permission,
  type Role,
} from "@/shared/lib/permissions";

export type NavIconId =
  | "dashboard"
  | "stock-in"
  | "sales-order"
  | "stock-out"
  | "inventory"
  | "catalog"
  | "partners"
  | "settings"
  | "stocktake"
  | "kiotviet-history";

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
  /**
   * Quyền THEO NGƯỜI (D-13/D-14), không theo `PERMISSION_MATRIX` — chỉ
   * "kiotviet-history" hiện dùng. Ẩn hẳn khỏi menu khi người dùng chưa được
   * bật công tắc, dù `permission` ở trên vẫn cho qua.
   */
  requires?: "kiotviet-history";
};

// mobilePriority (Phase 4, plan 04-15): thanh tab đáy chỉ có 4 ô chính, và
// đây là chỗ thủ kho cầm điện thoại dùng nhiều nhất. Chọn theo nhịp vận hành
// thật: ~92 phiếu xuất/ngày so với ~8 phiếu nhập/ngày (xem CLAUDE.md), nên
// "Xuất kho" đứng trước "Nhập kho". "Danh mục hàng" và "Đối tác" là màn tra
// cứu thỉnh thoảng, chuyển vào "Khác" (mobilePriority: null) để nhường chỗ
// cho "Đặt hàng" — băn khoăn hằng ngày của văn phòng khi lên đơn cho khách.
//
// Phase 5 (plan 05-11): "Tồn kho" lấy ô thứ 4 của "Đặt hàng". Thủ kho cầm điện
// thoại tra tồn nhiều lần mỗi ngày; văn phòng lên đơn chủ yếu trên máy tính
// (CLAUDE.md: văn phòng = máy tính, bảng dày), nên "Đặt hàng" rơi vào "Khác".
// Xuất (2) và Nhập (3) giữ nguyên vị trí người dùng đã quen từ UAT Phase 4.
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
    mobilePriority: 3,
  },
  {
    href: "/dat-hang",
    label: "Đặt hàng",
    shortLabel: "Đặt hàng",
    icon: "sales-order",
    permission: "view-catalog",
    mobilePriority: 5,
  },
  {
    href: "/xuat-kho",
    label: "Xuất kho",
    shortLabel: "Xuất",
    icon: "stock-out",
    permission: "view-catalog",
    mobilePriority: 2,
  },
  {
    // Sau luồng Nhập → Đặt → Xuất, trước dữ liệu nền. /ton-kho/dinh-muc và
    // /ton-kho/nap-tam không có mục riêng (việc định kỳ / một lần) — vào bằng
    // link trong trang; findActiveHref khớp tiền tố nên mục này vẫn sáng.
    href: "/ton-kho",
    label: "Tồn kho",
    shortLabel: "Tồn",
    icon: "inventory",
    permission: "view-catalog",
    mobilePriority: 4,
  },
  {
    // Phase 6: kiểm kê định kỳ, không phải việc hằng giờ như xuất/nhập nên
    // không chiếm ô nào của thanh tab đáy — vào bằng "Khác" (D-04, màn đếm
    // vẫn dùng tốt trên điện thoại một khi đã mở từ đó).
    href: "/kiem-ke",
    label: "Kiểm kê",
    shortLabel: "Kiểm kê",
    icon: "stocktake",
    permission: "view-catalog",
    mobilePriority: null,
  },
  {
    // Quyền THEO NGƯỜI (D-13) qua `requires`, không qua `permission` —
    // `filterNavItems` ẩn hẳn mục này khi người dùng chưa được bật công tắc
    // "Xem lịch sử KiotViet", dù `permission` ở đây (view-catalog) cho qua.
    href: "/lich-su-kiotviet",
    label: "Lịch sử KiotViet",
    shortLabel: "LS KiotViet",
    icon: "kiotviet-history",
    permission: "view-catalog",
    requires: "kiotviet-history",
    mobilePriority: null,
  },
  {
    href: "/danh-muc",
    label: "Danh mục hàng",
    shortLabel: "Hàng",
    icon: "catalog",
    permission: "view-catalog",
    mobilePriority: null,
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

/**
 * D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable.
 * Cộng thêm quyền THEO NGƯỜI (D-13/D-14) qua `requires`: mục "kiotviet-history"
 * còn bị ẩn thêm với người chưa bật công tắc, dù vai trò đã qua `permission`.
 */
export function filterNavItems(
  user: { role: Role; canViewKiotVietHistory: boolean },
  items: NavItem[],
): NavItem[] {
  return items
    .filter((item) => hasPermission(user.role, item.permission))
    .filter(
      (item) =>
        item.requires !== "kiotviet-history" || user.canViewKiotVietHistory,
    );
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
