"use client";

import type { QuyenDanhMuc } from "../types";
import { GoiYCongDoan } from "./goi-y-cong-doan";
import { NganKeoSanPham } from "./ngan-keo-san-pham";
import { NhapExcel } from "./nhap-excel";

type Props = {
  quyen: QuyenDanhMuc;
  goiYMo: boolean;
  onDongGoiY: () => void;
  nhapMo: boolean;
  onDongNhap: () => void;
  onXemMoiSua: () => void;
  nganKeo: { mo: boolean; id: string | null };
  onDongNganKeo: () => void;
};

/** Gom 3 ngăn kéo/modal của trang danh mục — không phải nội dung chính, tách khỏi bang-san-pham.tsx cho gọn. */
export function ModalsSanPham({
  quyen,
  goiYMo,
  onDongGoiY,
  nhapMo,
  onDongNhap,
  onXemMoiSua,
  nganKeo,
  onDongNganKeo,
}: Props) {
  return (
    <>
      <GoiYCongDoan open={goiYMo} onDong={onDongGoiY} />

      <NhapExcel open={nhapMo} onDong={onDongNhap} onXemMoiSua={onXemMoiSua} />

      <NganKeoSanPham
        id={nganKeo.id}
        open={nganKeo.mo}
        quyen={quyen}
        onDong={onDongNganKeo}
      />
    </>
  );
}
