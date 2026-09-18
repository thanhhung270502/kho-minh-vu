import type { Metadata } from "next";

import { CauHinhSoCt } from "@/features/cai-dat/components/cau-hinh-so-ct";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";

export const metadata: Metadata = { title: "Số chứng từ" };

export default async function Page() {
  await yeuCauQuyen("cai_dat_so_chung_tu");

  return <CauHinhSoCt />;
}
