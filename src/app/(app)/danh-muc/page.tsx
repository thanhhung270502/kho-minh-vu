import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Danh mục" };

export default function DanhMucPage() {
  return (
    <>
      <PageHeader
        tieuDe="Danh mục"
        moTa="Dữ liệu nền ít thay đổi, khai báo một lần rồi dùng lại."
      />

      <ChuaTrienKhai
        seCo={[
          "Xưởng và công đoạn của từng xưởng",
          "Sản phẩm, mã hàng, định mức nguyên vật liệu",
          "Khuôn và máy ép, gắn với sản phẩm chạy được",
          "Mã lỗi phế phẩm dùng chung cho cả 5 xưởng",
          "Người dùng và phân quyền theo xưởng",
        ]}
      />
    </>
  );
}
