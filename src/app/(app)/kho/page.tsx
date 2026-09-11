import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tồn kho" };

export default function KhoPage() {
  return (
    <>
      <PageHeader
        tieuDe="Tồn kho"
        moTa="Nguyên vật liệu, bán thành phẩm/phôi chờ xử lý và thành phẩm chờ xuất."
      />

      <ChuaTrienKhai
        seCo={[
          "Tồn theo 3 nhóm: nguyên vật liệu (hạt nhựa, hoá chất), phôi chờ xử lý (WIP), thành phẩm",
          "Tách riêng phôi chờ xử lý và thành phẩm hoàn thiện dù cùng nằm ở kho thành phẩm",
          "Phiếu nhập / xuất kho kèm người thực hiện và thời điểm",
          "Thẻ kho: truy vết một mã hàng đã nhập xuất những lần nào",
          "Cảnh báo tồn dưới định mức",
        ]}
        phuThuoc="thiết kế schema database (bảng kho, tồn, phiếu nhập xuất)"
      />
    </>
  );
}
