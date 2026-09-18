import type { ReactNode } from "react";

import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { TabCaiDat } from "@/features/cai-dat/components/tab-cai-dat";
import { PageHeader } from "@/shared/components/page-header";

export default async function CaiDatLayout({ children }: { children: ReactNode }) {
  // Tab ít quyền nhất là danh mục phụ; từng trang con còn tự gác quyền của nó.
  const nd = await yeuCauQuyen("cai_dat_danh_muc_phu");

  return (
    <>
      <PageHeader
        tieuDe="Cài đặt"
        moTa="Người dùng & vai trò, kho, nhóm hàng/ĐVT, quy tắc đánh số chứng từ."
      />

      <TabCaiDat vaiTro={nd.vaiTro} />

      {children}
    </>
  );
}
