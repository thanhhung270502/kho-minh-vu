import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { tabDauTien } from "@/features/cai-dat/components/tab-cai-dat";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function CaiDatPage() {
  const nd = await yeuCauQuyen("cai_dat_danh_muc_phu");

  // /cai-dat không có nội dung riêng — đưa thẳng tới tab đầu tiên người này vào được.
  redirect(tabDauTien(nd.vaiTro));
}
