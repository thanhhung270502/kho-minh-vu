import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Đối tác" };

export default function DoiTacPage() {
  return (
    <>
      <PageHeader
        tieuDe="Đối tác"
        moTa="Nhà cung cấp và khách hàng trong một danh sách."
      />

      <ChuaTrienKhai
        seCo={[
          "Danh sách NCC + khách hàng, tạo/sửa",
          "Lịch sử giao dịch theo đối tác",
          "Rà ghi chú (DLIEU-04)",
        ]}
        phuThuoc="thiết kế bảng đối tác (plan 13)"
      />
    </>
  );
}
