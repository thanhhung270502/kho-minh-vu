import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrangInPhieu } from "@/features/nhap-kho/components/trang-in-phieu";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";

export const metadata: Metadata = { title: "In phiếu nhập" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route riêng thay vì ẩn/hiện bằng CSS trên trang chi tiết: trang chi tiết có
 * ô nhập liệu, in ra sẽ dính cả khung nhập.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await yeuCauQuyen("xem_danh_muc");

  return <TrangInPhieu id={id} />;
}
