import type { Metadata } from "next";

import { BangNguoiDung } from "@/features/cai-dat/components/bang-nguoi-dung";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";

export const metadata: Metadata = { title: "Người dùng" };

export default async function Page() {
  const nd = await yeuCauQuyen("cai_dat_nguoi_dung");

  return <BangNguoiDung nguoiDungHienTaiId={nd.id} />;
}
