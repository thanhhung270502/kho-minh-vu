"use client";

import { Badge, Button } from "antd";

import type { BoLocSanPham } from "../schemas/bo-loc.schema";
import { NutExcel } from "./nut-excel";

type Props = {
  boLoc: BoLocSanPham;
  tong: number;
  demCanRa: number;
  quyenSua: boolean;
  onDoiBoLoc: (b: BoLocSanPham) => void;
  onMoNhap?: () => void;
  onMoGiaVon?: () => void;
};

/** Nút "Cần rà" (badge số lượng) + nút xuất/nhập Excel — cụm hành động phụ trên thanh công cụ. */
export function HanhDongCanRa({
  boLoc,
  tong,
  demCanRa,
  quyenSua,
  onDoiBoLoc,
  onMoNhap,
  onMoGiaVon,
}: Props) {
  return (
    <>
      <Badge count={demCanRa} overflowCount={9999} size="small">
        <Button
          type={boLoc.canRa ? "primary" : "default"}
          onClick={() => onDoiBoLoc({ ...boLoc, canRa: !boLoc.canRa, trang: 1 })}
        >
          Cần rà
        </Button>
      </Badge>
      <NutExcel
        boLoc={boLoc}
        soMa={tong}
        onMoNhap={quyenSua ? onMoNhap : undefined}
        onMoGiaVon={onMoGiaVon}
      />
    </>
  );
}
