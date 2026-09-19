import type { Metadata } from "next";
import { Suspense } from "react";

import { BangPhieuNhap } from "@/features/nhap-kho/components/bang-phieu-nhap";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { PageHeader } from "@/shared/components/page-header";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Phiếu nhập" };

export default async function NhapKhoPage() {
  const nd = await yeuCauQuyen("xem_danh_muc");

  return (
    <>
      <PageHeader
        tieuDe="Phiếu nhập"
        moTa="Hàng về kho — ghi sổ xong là tồn tăng và giá vốn tính lại."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangPhieuNhap coQuyenTao={coQuyen(nd.vaiTro, "sua_danh_muc")} />
      </Suspense>
    </>
  );
}
