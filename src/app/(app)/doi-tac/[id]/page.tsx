import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChiTietDoiTac } from "@/features/doi-tac/components/chi-tiet-doi-tac";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Chi tiết đối tác" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const nd = await yeuCauQuyen("xem_danh_muc");
  const sua = coQuyen(nd.vaiTro, "sua_danh_muc");

  return <ChiTietDoiTac id={id} quyen={{ sua, xemLichSu: sua }} />;
}
