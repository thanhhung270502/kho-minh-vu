import type { Metadata } from "next";
import { Suspense } from "react";

import { BangSanPham } from "@/features/danh-muc/components/bang-san-pham";
import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { PageHeader } from "@/shared/components/page-header";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Danh mục hàng" };

export default async function DanhMucPage() {
  const nd = await yeuCauQuyen("xem_danh_muc");

  return (
    <>
      <PageHeader
        tieuDe="Danh mục hàng"
        moTa="Tìm theo mã hoặc tên, gõ không dấu cũng được."
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangSanPham
          quyen={{
            sua: coQuyen(nd.vaiTro, "sua_danh_muc"),
            xemGiaVon: coQuyen(nd.vaiTro, "xem_gia_von"),
            suaGiaBan: coQuyen(nd.vaiTro, "sua_gia_ban"),
          }}
        />
      </Suspense>
    </>
  );
}
