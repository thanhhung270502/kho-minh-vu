"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BoCucDanhSach } from "@/shared/components/bo-cuc-danh-sach";
import { QueryState } from "@/shared/components/query-state";

import { useDanhMucPhu, useDanhSachSanPham } from "../hooks/useSanPham";
import {
  BO_LOC_MAC_DINH,
  demDieuKien,
  docBoLocTuUrl,
  ghiBoLocRaUrl,
  type BoLocSanPham,
} from "../schemas/bo-loc.schema";
import type { QuyenDanhMuc } from "../types";
import { AlertCanRa } from "./alert-can-ra";
import { taoCot } from "./cot-san-pham";
import { HanhDongCanRa } from "./hanh-dong-can-ra";
import { ModalsSanPham } from "./modals-san-pham";
import { NoiDungBangSanPham } from "./noi-dung-bang-san-pham";
import { PanelLocSanPham } from "./panel-loc-san-pham";
import { ThanhCongCuSanPham } from "./thanh-cong-cu-san-pham";
import { ThanhGanHangLoat } from "./thanh-gan-hang-loat";

export type { QuyenDanhMuc };

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
  const [chon, setChon] = useState<string[]>([]);
  const [goiYMo, setGoiYMo] = useState(false);
  const [nhapMo, setNhapMo] = useState(false);

  // Badge "Cần rà": lấy tổng từ chính RPC danh sách, không thêm RPC mới.
  const demCanRa = useDanhSachSanPham({
    ...BO_LOC_MAC_DINH,
    canRa: true,
    kinhDoanh: "tat_ca",
    kichThuoc: 10,
  });

  const dieuHuong = useCallback(
    (b: BoLocSanPham) => {
      const sp = ghiBoLocRaUrl(b).toString();
      router.replace(sp ? `${pathname}?${sp}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  /**
   * Người dùng đổi bộ lọc thì tập đang chọn không còn nghĩa — bỏ chọn để không
   * gán hàng loạt nhầm sang những mã họ không còn nhìn thấy. Tách khỏi
   * `dieuHuong` vì việc tự về trang 1 (trong effect bên dưới) không được phép
   * setState.
   */
  const doiBoLoc = useCallback(
    (b: BoLocSanPham) => {
      setChon([]);
      dieuHuong(b);
    },
    [dieuHuong],
  );

  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;

  // Trang cuối rỗng sau khi lọc lại — quay về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (danhSach.isPending || danhSach.isFetching) return;
    if (boLoc.trang > 1 && dong.length === 0) dieuHuong({ ...boLoc, trang: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSach.isPending, danhSach.isFetching, dong.length, boLoc.trang]);

  const cot = taoCot({
    boLoc,
    xemGiaVon: quyen.xemGiaVon,
    sua: quyen.sua,
    danhMucPhu: danhMucPhu.data,
    onSua: (id) => setNganKeo({ mo: true, id }),
  });

  return (
    <>
      <BoCucDanhSach
        panelLoc={
          <PanelLocSanPham boLoc={boLoc} danhMucPhu={danhMucPhu.data} onDoi={doiBoLoc} />
        }
        thanhCongCu={
          <ThanhCongCuSanPham
            boLoc={boLoc}
            onDoi={doiBoLoc}
            hanhDongPhu={
              <HanhDongCanRa
                boLoc={boLoc}
                tong={tong}
                demCanRa={demCanRa.data?.tong ?? 0}
                quyenSua={quyen.sua}
                onDoiBoLoc={doiBoLoc}
                onMoNhap={() => setNhapMo(true)}
              />
            }
            nutThem={
              quyen.sua ? (
                <Button type="primary" onClick={() => setNganKeo({ mo: true, id: null })}>
                  Thêm mã hàng
                </Button>
              ) : null
            }
          />
        }
        soDieuKien={demDieuKien(boLoc)}
      >
        <AlertCanRa
          hien={boLoc.canRa}
          choPhepSua={quyen.sua}
          onGoiY={() => setGoiYMo(true)}
        />

        {quyen.sua ? (
          <ThanhGanHangLoat
            ids={chon}
            danhMucPhu={danhMucPhu.data}
            onXong={() => setChon([])}
          />
        ) : null}

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
            <NoiDungBangSanPham
              cot={cot}
              dong={d.dong}
              tong={tong}
              boLoc={boLoc}
              coChon={quyen.sua}
              chon={chon}
              onChonDoi={setChon}
              dangTai={danhSach.isFetching && !danhSach.isPending}
              onDoiBoLoc={doiBoLoc}
            />
          )}
        </QueryState>
      </BoCucDanhSach>

      <ModalsSanPham
        quyen={quyen}
        goiYMo={goiYMo}
        onDongGoiY={() => setGoiYMo(false)}
        nhapMo={nhapMo}
        onDongNhap={() => setNhapMo(false)}
        onXemMoiSua={() => {
          setNhapMo(false);
          doiBoLoc({ ...BO_LOC_MAC_DINH, sapXep: "updated_at", huong: "desc" });
        }}
        nganKeo={nganKeo}
        onDongNganKeo={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
