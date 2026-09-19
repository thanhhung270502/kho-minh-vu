"use client";

import { QueryState } from "@/shared/components/query-state";

import { useChiTietPhieu, useDongPhieu } from "../hooks/usePhieuNhap";
import { MauInPhieuNhap } from "./mau-in-phieu-nhap";

export function TrangInPhieu({ id }: { id: string }) {
  const chiTiet = useChiTietPhieu(id);
  const dong = useDongPhieu(id);

  return (
    <QueryState
      query={chiTiet}
      isEmpty={(d) => d === null}
      emptyDescription="Không tìm thấy phiếu này."
    >
      {(phieu) =>
        phieu ? <MauInPhieuNhap phieu={phieu} dong={dong.data ?? []} /> : null
      }
    </QueryState>
  );
}
