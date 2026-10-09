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
        description="Phiếu tạm cho tới khi quản lý duyệt — duyệt xong mới in phiếu."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <OrderTable
          // Giống trang chi tiết đơn — phần xem nhanh dùng chung các nút của đơn.
          permissions={{
            canEdit: can(user, "tao_don"),
            canApprove: can(user, "xac_nhan_don"),
            canComplete: can(user, "xac_nhan_don"),
            canCancel: user.role === "quan_ly",
          }}
          excelActions={
            <DocumentExcelActions
              kind="don-dat"
              canImport={canImportDocuments(user, "don-dat")}
              exportButton={<OrderExcelButton />}
            />
          }
        />
      </Suspense>
    </>
  );
}
