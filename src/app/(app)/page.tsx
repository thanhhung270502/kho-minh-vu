import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tổng quan" };

export default function TongQuanPage() {
  return (
    <>
      <PageHeader tieuDe="Tổng quan" moTa="Tình hình kho trong ngày" />

      <ChuaTrienKhai
        seCo={[
          "Tồn kho theo nhóm hàng và công đoạn",
          "Mã dưới định mức tồn tối thiểu",
          "Hàng không luân chuyển quá 30 ngày",
          "Biểu đồ nhập–xuất 30 ngày",
        ]}
        phuThuoc="phiếu nhập và phiếu xuất (Phase 3–4)"
      />
    </>
  );
}
