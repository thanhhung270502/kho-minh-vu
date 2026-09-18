"use client";

import { Button, Table, Typography } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useDanhMucPhu, useDanhSachSanPham } from "../hooks/useSanPham";
import {
  BO_LOC_MAC_DINH,
  COT_SAP_XEP,
  docBoLocTuUrl,
  ghiBoLocRaUrl,
  KICH_THUOC_TRANG,
  type BoLocSanPham,
  type CotSapXep,
} from "../schemas/bo-loc.schema";
import type { DongSanPham } from "../types";
import { taoCot } from "./cot-san-pham";
import { NganKeoSanPham } from "./ngan-keo-san-pham";
import { ThanhLocSanPham } from "./thanh-loc-san-pham";

export type QuyenDanhMuc = {
  sua: boolean;
  xemGiaVon: boolean;
  suaGiaBan: boolean;
};

function coLoc(b: BoLocSanPham): boolean {
  return (
    b.nhomHangId !== null ||
    b.congDoanId !== null ||
    b.dvtId !== null ||
    b.trangThaiTon !== null ||
    b.canRa ||
    b.kinhDoanh !== BO_LOC_MAC_DINH.kinhDoanh
  );
}

export function BangSanPham({ quyen }: { quyen: QuyenDanhMuc }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const boLoc = useMemo(() => docBoLocTuUrl(searchParams), [searchParams]);
  const danhSach = useDanhSachSanPham(boLoc);
  const danhMucPhu = useDanhMucPhu();
  const [nganKeo, setNganKeo] = useState<{ mo: boolean; id: string | null }>({
    mo: false,
    id: null,
  });

  const doiBoLoc = useCallback(
    (b: BoLocSanPham) => {
      const sp = ghiBoLocRaUrl(b).toString();
      router.replace(sp ? `${pathname}?${sp}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;

  // Trang cuối rỗng sau khi lọc lại — quay về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (danhSach.isPending || danhSach.isFetching) return;
    if (boLoc.trang > 1 && dong.length === 0) doiBoLoc({ ...boLoc, trang: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSach.isPending, danhSach.isFetching, dong.length, boLoc.trang]);

  function onBangDoi(
    trang: { current?: number; pageSize?: number },
    sorter: SorterResult<DongSanPham> | SorterResult<DongSanPham>[],
  ) {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const cot = s?.columnKey as CotSapXep | undefined;
    const hopLe = cot && COT_SAP_XEP.includes(cot);

    doiBoLoc({
      ...boLoc,
      trang: trang.current ?? 1,
      kichThuoc: trang.pageSize ?? boLoc.kichThuoc,
      sapXep: hopLe && s?.order ? cot : null,
      huong: s?.order === "descend" ? "desc" : "asc",
    });
  }

  const moiTonBang0 = dong.length > 0 && dong.every((d) => Number(d.tong_ton) === 0);

  return (
    <>
      <ThanhLocSanPham
        boLoc={boLoc}
        danhMucPhu={danhMucPhu.data}
        onDoi={doiBoLoc}
        nutThem={
          quyen.sua ? (
            <Button type="primary" onClick={() => setNganKeo({ mo: true, id: null })}>
              Thêm mã hàng
            </Button>
          ) : null
        }
      />

      <QueryState
        query={danhSach}
        laRong={(d) => d.dong.length === 0}
        moTaRong={
          boLoc.q ? (
            `Không có mã khớp “${boLoc.q}”. Thử gõ ít chữ hơn hoặc bỏ dấu.`
          ) : coLoc(boLoc) ? (
            <div className="flex flex-col items-center gap-3">
              <span>Không có mã nào khớp bộ lọc. Xóa bớt điều kiện.</span>
              <Button size="small" onClick={() => doiBoLoc(BO_LOC_MAC_DINH)}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            "Chưa có mã hàng nào. Bấm “Thêm mã hàng” hoặc nhập từ Excel."
          )
        }
      >
        {(d) => (
          <>
            <div className="overflow-x-auto">
              <Table<DongSanPham>
                rowKey="id"
                size="small"
                sticky
                columns={taoCot({
                  boLoc,
                  xemGiaVon: quyen.xemGiaVon,
                  sua: quyen.sua,
                  onSua: (id) => setNganKeo({ mo: true, id }),
                })}
                dataSource={d.dong}
                loading={danhSach.isFetching && !danhSach.isPending}
                scroll={{ x: 1100 }}
                onChange={(p, _f, s) => onBangDoi(p, s)}
                pagination={{
                  current: boLoc.trang,
                  pageSize: boLoc.kichThuoc,
                  total: tong,
                  showSizeChanger: true,
                  pageSizeOptions: [...KICH_THUOC_TRANG],
                  showTotal: (t) => `${t.toLocaleString("vi-VN")} mã`,
                }}
              />
            </div>

            {moiTonBang0 ? (
              <Typography.Text type="secondary" className="mt-2 block text-xs">
                Tồn đang bằng 0 cho mọi mã vì chưa có phiếu nhập — tồn thật được đặt khi
                kiểm kê đầu kỳ.
              </Typography.Text>
            ) : null}
          </>
        )}
      </QueryState>

      <NganKeoSanPham
        id={nganKeo.id}
        open={nganKeo.mo}
        quyen={quyen}
        onDong={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
