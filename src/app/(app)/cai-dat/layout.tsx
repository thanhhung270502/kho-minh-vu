import type { ReactNode } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { TabCaiDat } from "@/features/cai-dat/components/tab-cai-dat";
import { PageHeader } from "@/shared/components/page-header";

export default async function CaiDatLayout({ children }: { children: ReactNode }) {
  // Tab ít quyền nhất là danh mục phụ; từng trang con còn tự gác quyền của nó.
  const nd = await requirePermission("manage-lookups");

  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Người dùng & vai trò, kho, nhóm hàng/ĐVT, quy tắc đánh số chứng từ."
      />

      <TabCaiDat role={nd.role} />

      {children}
    </>
  );
}
