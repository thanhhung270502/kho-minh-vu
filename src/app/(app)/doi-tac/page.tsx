import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { yeuCauQuyen } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { BangDoiTac } from "@/features/doi-tac/components/bang-doi-tac";
import { PageHeader } from "@/shared/components/page-header";
import { coQuyen } from "@/shared/lib/quyen";

export const metadata: Metadata = { title: "Đối tác" };

export default async function DoiTacPage() {
  const nd = await yeuCauQuyen("xem_danh_muc");
  const coQuyenSua = coQuyen(nd.vaiTro, "sua_danh_muc");

  return (
    <>
      <PageHeader
        tieuDe="Đối tác"
        moTa="Nhà cung cấp và khách hàng trong một danh sách."
        hanhDong={
          coQuyenSua ? <Link href="/doi-tac/ra-ghi-chu">Rà ghi chú KiotViet</Link> : null
        }
      />

      {/* `useSearchParams()` trong bảng bắt buộc có ranh giới Suspense. */}
      <Suspense fallback={null}>
        <BangDoiTac coQuyenSua={coQuyenSua} />
      </Suspense>
    </>
  );
}
