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
 * 9 quyền nghiệp vụ tích theo TỪNG NGƯỜI (0117). Khóa là giá trị CHECK của
 * `nguoi_dung_quyen.quyen` — hợp đồng với database, giữ tiếng Việt. Tài khoản
 * Quản lý/Admin luôn đủ cả 9 (quyen_cua_toi trả đủ). Chặn thật ở `co_quyen()`;
 * ở đây chỉ để ẩn/hiện giao diện. Việc chỉ Admin làm (kiểm kho, nhân viên phụ
 * trách, hủy hóa đơn đã ghi sổ) kiểm bằng `isAdmin`.
 */
export type BusinessPermission =
  | "tao_tai_khoan"
  | "phan_quyen"
  | "tao_don"
  | "xac_nhan_don"
  | "nhap_kho"
  | "tao_doi_tac"
  | "tao_ma_hang"
  | "xem_dashboard"
  | "xem_phan_tich";

export const BUSINESS_PERMISSIONS: ReadonlyArray<{ key: BusinessPermission; label: string; hint: string }> = [
  { key: "tao_tai_khoan", label: "Tạo tài khoản", hint: "Thêm, sửa, khóa tài khoản nhân viên, đặt lại mật khẩu" },
  { key: "phan_quyen", label: "Phân quyền", hint: "Tích quyền cho tài khoản nhân viên" },
  { key: "tao_don", label: "Tạo đơn đặt hàng", hint: "Tạo và sửa đơn còn tạm" },
  { key: "xac_nhan_don", label: "Xác nhận / duyệt đơn", hint: "Xác nhận, mở khóa, đóng sớm, hoàn thành đơn" },
  { key: "nhap_kho", label: "Nhập kho", hint: "Tạo, sửa, ghi sổ phiếu nhập" },
  { key: "tao_doi_tac", label: "Tạo đối tác", hint: "Thêm, sửa đối tác, nhập Excel đối tác" },
  { key: "tao_ma_hang", label: "Tạo mã hàng", hint: "Thêm, sửa mã hàng, ảnh, danh mục phụ, nhập Excel" },
  { key: "xem_dashboard", label: "Xem trang Tổng quan", hint: "" },
  { key: "xem_phan_tich", label: "Xem trang Phân tích", hint: "" },
];

/** Người dùng hiện tại tối thiểu cho các hàm kiểm quyền — vai trò (phạm vi) + quyền theo người. */
export type PermissionSubject = { role: Role; permissions: readonly BusinessPermission[] };

/** Quản lý/Admin — việc chỉ Admin làm: kiểm kho, nhân viên phụ trách, hủy chứng từ đã ghi sổ (0117). */
export function isAdmin(user: PermissionSubject | null | undefined): boolean {
  return user?.role === "quan_ly";
}

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
  quan_ly: "Quản lý/Admin — mọi kho, đủ mọi quyền",
  van_phong: "Nhân viên — mọi kho",
  thu_kho: "Nhân viên — chỉ kho được giao",
  chi_xem: "Chỉ xem",
};

export const ROLE_LABELS: Record<Role, string> = {
  quan_ly: "Quản lý/Admin",
  van_phong: "Nhân viên",
  thu_kho: "Nhân viên (kho được giao)",
  chi_xem: "Chỉ xem",
};
