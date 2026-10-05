import type { Metadata } from "next";
import { Suspense } from "react";

import { ReceiptTable } from "@/features/stock-in/components/receipt-table";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { DocumentExcelActions } from "@/features/document-excel/components/document-excel-actions";
import { canImportDocuments } from "@/features/document-excel/lib/document-access";
import { PageHeader } from "@/shared/components/page-header";
import { can } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Phiếu nhập" };

export default async function StockInPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Phiếu nhập"
        description="Hàng về kho — ghi sổ xong là tồn tăng và giá vốn tính lại."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <ReceiptTable
          canCreate={can(user, "nhap_kho")}
          excelActions={<DocumentExcelActions kind="phieu-nhap" canImport={canImportDocuments(user, "phieu-nhap")} />}
        />
      </Suspense>
    </>
  );
}
