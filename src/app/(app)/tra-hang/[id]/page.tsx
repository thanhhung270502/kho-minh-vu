import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReturnDetailView } from "@/features/returns/components/return-detail";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phiếu trả hàng" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route duy nhất của `features/returns` trong phase này — KHÔNG có màn danh
 * sách `/tra-hang` (chỉ tới được qua nút "Khách trả hàng"/"Trả hàng NCC" trên
 * chứng từ gốc, hoặc link "Từ chứng từ …" ngược lại). Bẫy 12: route này VẪN
 * phải có dòng riêng trong `scripts/test-route-permissions.ts` dù không có
 * danh sách — thêm ở chính plan này, không đợi 04-15.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("view-catalog");

  return (
    <ReturnDetailView
      id={id}
      permissions={{
        canEdit: hasPermission(user.role, "edit-catalog"),
        // D-06: chỉ quản lý hủy phiếu đã ghi sổ. Chặn thật ở database (0051).
        canVoid: user.role === "quan_ly",
      }}
    />
  );
}
