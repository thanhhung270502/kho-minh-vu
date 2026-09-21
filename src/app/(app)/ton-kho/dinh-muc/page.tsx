import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { ReorderLevelTable } from "@/features/inventory/components/reorder-level-table";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Duyệt định mức tồn" };

export default async function ReorderLevelPage() {
  // Quản lý + văn phòng — đúng hai vai trò `dat_dinh_muc` cho ghi ở database (D-04).
  // Thủ kho / chỉ xem gõ thẳng URL bị đẩy sang /khong-du-quyen.
  await requirePermission("edit-catalog");

  return (
    <>
      <PageHeader
        title="Duyệt định mức tồn tối thiểu"
        description="Hệ đề xuất từ lịch sử bán, người duyệt quyết. Định mức chỉ đổi khi bạn bấm duyệt."
      />

      <Suspense fallback={null}>
        <ReorderLevelTable />
      </Suspense>
    </>
  );
}
