import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChiTietPhieuNhap } from "@/features/nhap-kho/components/chi-tiet-phieu-nhap";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Phiếu nhập" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const nd = await yeuCauQuyen("xem_danh_muc");

  return (
    <ChiTietPhieuNhap
      id={id}
      quyen={{
        sua: coQuyen(nd.vaiTro, "sua_danh_muc"),
        // D-11: chỉ quản lý hủy phiếu đã ghi sổ. Chặn thật ở database (plan 10).
        huy: nd.vaiTro === "quan_ly",
      }}
    />
  );
}
