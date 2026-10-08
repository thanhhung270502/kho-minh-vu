// File thuần (bẫy 9): Server Component (trang) và route handler cùng dùng để ẩn/chặn
// nút nhập Excel. Chặn thật nằm ở RPC nhap_chung_tu_excel (0104).
import { can, type PermissionSubject } from "@/shared/lib/permissions";

import type { DocumentKind } from "./document-excel";

export function canImportDocuments(user: PermissionSubject | null | undefined, kind: DocumentKind): boolean {
  if (!user || user.role === "chi_xem") return false;
  if (kind === "don-dat") return can(user, "tao_don");
  if (kind === "phieu-nhap") return can(user, "nhap_kho");
  return user.role === "quan_ly" || user.role === "van_phong";
}
