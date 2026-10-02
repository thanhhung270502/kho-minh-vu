// Ma trận này CHỈ quyết định ẩn/hiện giao diện. Chặn thật nằm ở RLS — sửa
// quyền phải sửa migration trước.
import type { Database } from "@/types/database.types";

/** Giá trị enum `vai_tro` của database — KHÔNG đổi, JWT claim mang đúng chuỗi này. */
export type Role = Database["public"]["Enums"]["vai_tro"];

export type Permission =
  | "view-catalog"
  | "edit-catalog"
  | "manage-lookups"
  | "manage-users"
  | "manage-warehouses"
  | "manage-doc-numbering"
  | "view-dashboard";

const PERMISSION_MATRIX: Record<Permission, readonly Role[]> = {
  "view-catalog": ["quan_ly", "van_phong", "thu_kho", "chi_xem"],
  "edit-catalog": ["quan_ly", "van_phong"],
  "manage-lookups": ["quan_ly", "van_phong"],
  "manage-users": ["quan_ly"],
  "manage-warehouses": ["quan_ly"],
  "manage-doc-numbering": ["quan_ly"],
  // Trang tổng quan chỉ dành cho quản lý (D-11). Đây chỉ là ẩn menu — chặn thật
  // ở redirect của `app/(app)/page.tsx` (07-09) và 42501 của các RPC dashboard
  // (07-01..03).
  "view-dashboard": ["quan_ly"],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  return !!role && PERMISSION_MATRIX[permission].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  quan_ly: "Quản lý",
  van_phong: "Văn phòng",
  thu_kho: "Thủ kho",
  chi_xem: "Chỉ xem",
};
