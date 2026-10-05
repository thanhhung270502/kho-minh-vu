import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { DocumentExcelActions } from "@/features/document-excel/components/document-excel-actions";
import { canImportDocuments } from "@/features/document-excel/lib/document-access";
import { OrderExcelButton } from "@/features/sales-order/components/order-excel-button";
import { OrderTable } from "@/features/sales-order/components/order-table";
import { PageHeader } from "@/shared/components/page-header";
import { can } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đơn đặt" };

export default async function SalesOrderPage() {
  const user = await requirePermission("view-catalog");

  return (
    <>
      <PageHeader
        title="Đơn đặt"
        actions={
          <Suspense fallback={null}>
            <DocumentExcelActions
              kind="don-dat"
              canImport={canImportDocuments(user, "don-dat")}
              exportButton={<OrderExcelButton />}
            />
          </Suspense>
        }
        description="Đơn tạm cho tới khi quản lý xác nhận — xác nhận xong mới in phiếu."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <OrderTable canCreate={can(user, "tao_don")} />
      </Suspense>
    </>
  );
}
