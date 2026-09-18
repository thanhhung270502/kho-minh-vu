import type { Metadata } from "next";

import { DanhMucPhu } from "@/features/cai-dat/components/danh-muc-phu";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";

export const metadata: Metadata = { title: "Kho" };

export default async function Page() {
  await yeuCauQuyen("cai_dat_kho");

  return <DanhMucPhu bang="kho" />;
}
