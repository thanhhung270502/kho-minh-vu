import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChiTietSanPham } from "@/features/danh-muc/components/chi-tiet-san-pham";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Chi tiết mã hàng" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const nd = await yeuCauQuyen("xem_danh_muc");

  return (
    <ChiTietSanPham
      id={id}
      quyen={{
        sua: coQuyen(nd.vaiTro, "sua_danh_muc"),
        xemGiaVon: coQuyen(nd.vaiTro, "xem_gia_von"),
        suaGiaBan: coQuyen(nd.vaiTro, "sua_gia_ban"),
        xemLichSu: coQuyen(nd.vaiTro, "sua_danh_muc"),
      }}
    />
  );
}
