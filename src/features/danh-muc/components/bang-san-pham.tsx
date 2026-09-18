"use client";

import { Alert, Badge, Button, Table, Typography } from "antd";
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
import { GoiYCongDoan } from "./goi-y-cong-doan";
import { NganKeoSanPham } from "./ngan-keo-san-pham";
import { NutExcel } from "./nut-excel";
import { ThanhGanHangLoat } from "./thanh-gan-hang-loat";
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
  const [chon, setChon] = useState<string[]>([]);
  const [goiYMo, setGoiYMo] = useState(false);

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
        hanhDongPhu={
          <>
            <Badge count={demCanRa.data?.tong ?? 0} overflowCount={9999} size="small">
              <Button
                type={boLoc.canRa ? "primary" : "default"}
                onClick={() => doiBoLoc({ ...boLoc, canRa: !boLoc.canRa, trang: 1 })}
              >
                Cần rà
              </Button>
            </Badge>
            <NutExcel boLoc={boLoc} soMa={tong} />
          </>
        }
        nutThem={
          quyen.sua ? (
            <Button type="primary" onClick={() => setNganKeo({ mo: true, id: null })}>
              Thêm mã hàng
            </Button>
          ) : null
        }
      />

      {boLoc.canRa ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          message="Mã mua ngoài chưa rõ công đoạn và các mã có ô ĐVT mâu thuẫn"
          description="Gán lại công đoạn, hoặc chọn rồi bấm “Xác nhận đã rà” nếu hiện tại đã đúng."
          action={
            quyen.sua ? (
              <Button size="small" onClick={() => setGoiYMo(true)}>
                Gợi ý theo đuôi mã
              </Button>
            ) : null
          }
        />
      ) : null}

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
                  danhMucPhu: danhMucPhu.data,
                  onSua: (id) => setNganKeo({ mo: true, id }),
                })}
                rowSelection={
                  quyen.sua
                    ? {
                        selectedRowKeys: chon,
                        onChange: (keys) => setChon(keys as string[]),
                        // Chọn ở trang 1, sang trang 2 chọn tiếp: antd v6 chỉ
                        // giữ được khóa ngoài trang hiện tại khi bật cờ này.
                        preserveSelectedRowKeys: true,
                      }
                    : undefined
                }
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

      <GoiYCongDoan open={goiYMo} onDong={() => setGoiYMo(false)} />

      <NganKeoSanPham
        id={nganKeo.id}
        open={nganKeo.mo}
        quyen={quyen}
        onDong={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
