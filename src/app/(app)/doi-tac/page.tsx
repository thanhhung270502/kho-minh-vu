import type { Metadata } from "next";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { PartnerTable } from "@/features/partners/components/partner-table";
import { ExcelActions } from "@/shared/components/excel-actions";
import { PageHeader } from "@/shared/components/page-header";
import { hasPermission } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Đối tác" };

export default async function PartnersPage() {
  const user = await requirePermission("view-catalog");
  const canEdit = hasPermission(user.role, "edit-catalog");

  return (
    <>
      <PageHeader
        title="Đối tác"
        description="Danh sách nhà cung cấp."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <PartnerTable
          canEdit={canEdit}
          excelActions={
            <ExcelActions
              apiBase="/api/doi-tac/excel"
              fileStem="doi-tac"
              canImport={canEdit}
              copy={{
                label: "đối tác",
                hint: {
                  moi: "Mỗi dòng là một đối tác mới. Mã để trống thì hệ thống tự cấp mã theo loại; mã đã có sẽ báo lỗi.",
                  cap_nhat:
                    "Tìm đối tác theo Mã nhà cung cấp, ô trống = giữ nguyên. Lấy file bằng “Tải mẫu cập nhật” ở nút ⋯ — file có sẵn các đối tác đang lọc.",
                },
              }}
            />
          }
        />
      </Suspense>
    </>
  );
}
