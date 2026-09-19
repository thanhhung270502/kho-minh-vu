"use client";

import { Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useChiTietPhieu, useDongPhieu } from "../hooks/usePhieuNhap";
import type { QuyenPhieuNhap } from "../types";
import { BangDongNhap } from "./bang-dong-nhap";
import { DauPhieuNhap } from "./dau-phieu-nhap";
import { HopHuyPhieu } from "./hop-huy-phieu";
import { NutGhiSo } from "./nut-ghi-so";

export function ChiTietPhieuNhap({ id, quyen }: { id: string; quyen: QuyenPhieuNhap }) {
  const chiTiet = useChiTietPhieu(id);
  const dong = useDongPhieu(id);
  const [huyMo, setHuyMo] = useState(false);

  return (
    <QueryState
      query={chiTiet}
      laRong={(d) => d === null}
      moTaRong={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy phiếu này, hoặc phiếu không thuộc kho bạn được phân công.</span>
          <Link href="/nhap-kho">
            <Button size="small">Về danh sách phiếu nhập</Button>
          </Link>
        </div>
      }
    >
      {(phieu) => {
        if (!phieu) return null;

        const cacDong = dong.data ?? [];
        const conSua = phieu.trang_thai === "NHAP_LIEU";

        return (
          <>
            <Link href="/nhap-kho" className="mb-2 inline-block text-sm">
              ← Phiếu nhập
            </Link>

            <PageHeader
              tieuDe={phieu.so_ct}
              moTa={phieu.ten_doi_tac ?? "Chưa chọn nhà cung cấp"}
              hanhDong={
                <Space wrap>
                  <Link href={`/nhap-kho/${id}/in`} target="_blank">
                    <Button>In phiếu</Button>
                  </Link>

                  {/* Phiếu chưa ghi sổ: người nhập tự hủy được. Đã ghi sổ: chỉ quản lý (D-11). */}
                  {phieu.trang_thai !== "DA_HUY" && (conSua ? quyen.sua : quyen.huy) ? (
                    <Button danger onClick={() => setHuyMo(true)}>
                      Hủy phiếu
                    </Button>
                  ) : null}

                  <NutGhiSo phieu={phieu} dong={cacDong} coQuyenSua={quyen.sua} />
                </Space>
              }
            />

            <DauPhieuNhap phieu={phieu} coQuyenSua={quyen.sua} />

            <div className="mt-4">
              <QueryState query={dong} laRong={() => false} moTaRong="">
                {(d) => (
                  <BangDongNhap phieu={phieu} dong={d} coQuyenSua={quyen.sua} />
                )}
              </QueryState>
            </div>

            <HopHuyPhieu phieu={phieu} open={huyMo} onDong={() => setHuyMo(false)} />
          </>
        );
      }}
    </QueryState>
  );
}
