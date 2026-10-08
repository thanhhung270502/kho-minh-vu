import type { Metadata } from "next";
import { Suspense } from "react";

import { IssueTable } from "@/features/stock-out/components/issue-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { DocumentExcelActions } from "@/features/document-excel/components/document-excel-actions";
import { canImportDocuments } from "@/features/document-excel/lib/document-access";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission, isAdmin } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Duyệt đơn" };

export default async function StockOutPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Duyệt đơn"
        description="Hàng ra kho — ghi sổ xong là tồn giảm."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <IssueTable
          // Giống trang chi tiết hóa đơn — phần xem nhanh dùng chung các nút của phiếu.
          permissions={{
            canEdit: hasPermission(user.role, "edit-catalog"),
            canVoid: isAdmin(user),
          }}
          excelActions={<DocumentExcelActions kind="hoa-don" canImport={canImportDocuments(user, "hoa-don")} />}
        />
      </Suspense>
    </>
  );
}
