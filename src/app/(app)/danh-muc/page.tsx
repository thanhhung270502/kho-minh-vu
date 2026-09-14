import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Danh mục hàng" };

export default function DanhMucPage() {
  return (
    <>
      <PageHeader
        tieuDe="Danh mục hàng"
        moTa="Dữ liệu nền ít thay đổi, khai báo một lần rồi dùng lại."
      />

      <ChuaTrienKhai
        seCo={[
          "Danh mục sản phẩm, mã hàng, nhóm hàng, ĐVT",
          "Import/rà soát dữ liệu từ KiotViet",
          "Ẩn giá vốn theo vai trò khi xem",
        ]}
        phuThuoc="thiết kế bảng danh mục (plan 16)"
      />
    </>
  );
}
