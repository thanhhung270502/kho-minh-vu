// Ma trận này CHỈ quyết định ẩn/hiện giao diện. Chặn thật nằm ở RLS — sửa
// quyền phải sửa migration trước.
import type { Database } from "@/types/database.types";

/** Giá trị enum `vai_tro` của database — KHÔNG đổi, JWT claim mang đúng chuỗi này. */
export type Role = Database["public"]["Enums"]["vai_tro"];

export type Permission =
  | "view-catalog"
  | "edit-catalog"
  | "manage-users"
  | "manage-warehouses"
  | "manage-doc-numbering"
  | "view-analysis"
  | "view-cost";

const PERMISSION_MATRIX: Record<Permission, readonly Role[]> = {
  "view-catalog": ["quan_ly", "van_phong", "thu_kho", "chi_xem"],
  "edit-catalog": ["quan_ly", "van_phong"],
  "manage-users": ["quan_ly"],
  "manage-warehouses": ["quan_ly"],
  "manage-doc-numbering": ["quan_ly"],
  // Trang Phân tích (Phase 13): văn phòng đi đặt hàng NCC nên cần xem. Tồn mọi
  // kho nên thủ kho không xem; chặn thật ở xem_duoc_phan_tich() (0079).
  "view-analysis": ["quan_ly", "van_phong"],
  // Xem giá vốn/giá trị tồn — khớp co_quyen_xem_gia_von() (0029); chặn thật ở
  // RPC gia_von_san_pham / tong_quan_chi_so, đây chỉ ẩn cột.
  "view-cost": ["quan_ly", "van_phong"],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  return !!role && PERMISSION_MATRIX[permission].includes(role);
}

/**
 * 9 quyền nghiệp vụ bật/tắt theo CHỨC VỤ (Phase 16). Khóa là giá trị CHECK của
 * `chuc_vu_quyen.quyen` (0082) — hợp đồng với database, giữ tiếng Việt. Chặn
 * thật ở `co_quyen()` (0083); ở đây chỉ để ẩn/hiện giao diện.
 */
export type BusinessPermission =
  | "xem_dashboard"
  | "nhap_kho"
  | "tao_don"
  | "xac_nhan_don"
  | "hoan_thanh_don"
  | "sua_hoa_don"
  | "tao_ma_hang"
  | "tao_nhan_vien"
  | "kiem_kho";

export const BUSINESS_PERMISSIONS: ReadonlyArray<{ key: BusinessPermission; label: string; hint: string }> = [
  { key: "xem_dashboard", label: "Xem dashboard", hint: "Trang Tổng quan" },
  { key: "nhap_kho", label: "Nhập đơn hàng", hint: "Tạo, sửa, ghi sổ phiếu nhập kho" },
  { key: "tao_don", label: "Tạo đơn đặt hàng", hint: "Tạo và sửa đơn còn tạm" },
  { key: "xac_nhan_don", label: "Xác nhận", hint: "Xác nhận, mở khóa, đóng sớm đơn" },
  { key: "hoan_thanh_don", label: "Hoàn thành", hint: "Hoàn thành đơn, tạo hóa đơn" },
  { key: "sua_hoa_don", label: "Sửa hóa đơn", hint: "Hủy hóa đơn đã ghi sổ" },
  { key: "tao_ma_hang", label: "Tạo mã hàng", hint: "Thêm, sửa mã hàng, ảnh, danh mục phụ, nhập Excel" },
  { key: "tao_nhan_vien", label: "Tạo nhân viên", hint: "Danh sách nhân viên phụ trách" },
  { key: "kiem_kho", label: "Kiểm kho", hint: "Mở phiên, đếm, nhập số đếm" },
];

/** Người dùng hiện tại tối thiểu cho các hàm kiểm quyền — vai trò (phạm vi) + quyền chức vụ. */
export type PermissionSubject = { role: Role; permissions: readonly BusinessPermission[] };

export function can(user: PermissionSubject | null | undefined, permission: BusinessPermission): boolean {
  return !!user && user.permissions.includes(permission);
}

/** Quyền theo phạm vi (vai trò) hoặc quyền chức vụ — một hàm cho route, menu, tab. */
export type AnyPermission = Permission | BusinessPermission;

const BUSINESS_KEYS = new Set<string>(BUSINESS_PERMISSIONS.map((p) => p.key));

function isBusinessPermission(permission: AnyPermission): permission is BusinessPermission {
  return BUSINESS_KEYS.has(permission);
}

/** Mảng = có MỘT trong các quyền (vd. menu Cài đặt: quản trị tài khoản HOẶC Tạo nhân viên). */
export function allows(
  user: PermissionSubject | null | undefined,
  permission: AnyPermission | readonly AnyPermission[],
): boolean {
  if (!user) return false;
  const list: readonly AnyPermission[] = typeof permission === "string" ? [permission] : permission;
  return list.some((p) => (isBusinessPermission(p) ? can(user, p) : hasPermission(user.role, p)));
}

/** Phạm vi của chức vụ = enum vai_tro cũ. */
export const SCOPE_LABELS: Record<Role, string> = {
  quan_ly: "Quản trị — mọi kho, quản lý tài khoản",
  van_phong: "Văn phòng — mọi kho",
  thu_kho: "Thủ kho — chỉ kho được giao",
  chi_xem: "Chỉ xem",
};

export const ROLE_LABELS: Record<Role, string> = {
  quan_ly: "Quản lý",
  van_phong: "Văn phòng",
  thu_kho: "Thủ kho",
  chi_xem: "Chỉ xem",
};
