import type { Metadata } from "next";

import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function CaiDatPage() {
  await yeuCauQuyen("cai_dat_danh_muc_phu");

  return (
    <>
      <PageHeader
        tieuDe="Cài đặt"
        moTa="Người dùng & vai trò, kho, nhóm hàng/ĐVT, quy tắc đánh số chứng từ."
      />

      <ChuaTrienKhai
        seCo={[
          "Người dùng và vai trò",
          "Kho",
          "Nhóm hàng / ĐVT / công đoạn",
          "Quy tắc đánh số chứng từ",
        ]}
        phuThuoc="thiết kế màn cài đặt (plan 15)"
      />
    </>
  );
}
