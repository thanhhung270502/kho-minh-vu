import type { Metadata } from "next";

import { NotImplemented } from "@/shared/components/not-implemented";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tổng quan" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Tổng quan" description="Tình hình kho trong ngày" />

      <NotImplemented
        planned={[
          "Tồn kho theo nhóm hàng và công đoạn",
          "Mã dưới định mức tồn tối thiểu",
          "Hàng không luân chuyển quá 30 ngày",
          "Biểu đồ nhập–xuất 30 ngày",
        ]}
        dependsOn="phiếu nhập và phiếu xuất (Phase 3–4)"
      />
    </>
  );
}
