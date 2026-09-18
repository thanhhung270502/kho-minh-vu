import type { Metadata } from "next";
import Link from "next/link";

import { RaGhiChu } from "@/features/doi-tac/components/ra-ghi-chu";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Rà ghi chú KiotViet" };

export default async function RaGhiChuPage() {
  await yeuCauQuyen("sua_danh_muc");

  return (
    <>
      <Link href="/doi-tac" className="mb-2 inline-block text-sm">
        ← Đối tác
      </Link>

      <PageHeader
        tieuDe="Rà ghi chú KiotViet"
        moTa="Biến tên trong ô Ghi chú hóa đơn cũ thành khách hàng thật. Hệ thống không tự đoán — bạn quyết từng giá trị."
      />

      <RaGhiChu />
    </>
  );
}
