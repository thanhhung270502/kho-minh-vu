"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BoCucDanhSach } from "@/shared/components/bo-cuc-danh-sach";
import { HangTongCong } from "@/shared/components/hang-tong-cong";
import { QueryState } from "@/shared/components/query-state";

import { docBoLocDoiTac, ghiBoLocDoiTac } from "../api/doi-tac.api";
import { useDanhSachDoiTac } from "../hooks/useDoiTac";
import type { BoLocDoiTac, DongDoiTac } from "../types";
import {
  BO_LOC_DOI_TAC_MAC_DINH,
  demDieuKienDoiTac,
  MAU_LOAI_DOI_TAC,
  NHAN_LOAI_DOI_TAC,
} from "../types";
import { NganKeoDoiTac } from "./ngan-keo-doi-tac";
import { PanelLocDoiTac } from "./panel-loc-doi-tac";
import { ThanhCongCuDoiTac } from "./thanh-cong-cu-doi-tac";

const KICH_THUOC_TRANG = 50;

function coLoc(b: BoLocDoiTac): boolean {
  return b.q !== "" || b.loai !== null || b.hoatDong !== BO_LOC_DOI_TAC_MAC_DINH.hoatDong;
}

export function BangDoiTac({ coQuyenSua }: { coQuyenSua: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const boLoc = docBoLocDoiTac(searchParams);
  const danhSach = useDanhSachDoiTac(boLoc);
  const [nganKeo, setNganKeo] = useState<{ mo: boolean; id: string | null }>({
    mo: false,
    id: null,
  });

  const dieuHuong = useCallback(
    (b: BoLocDoiTac) => {
      const sp = ghiBoLocDoiTac(b).toString();
      router.replace(sp ? `${pathname}?${sp}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Đổi bất kỳ điều kiện nào cũng về trang 1: giữ nguyên trang cũ thì rất dễ
  // rơi vào trang trống và tưởng là không có dữ liệu.
  function doiBoLoc(thayDoi: Partial<BoLocDoiTac>) {
    dieuHuong({ ...boLoc, ...thayDoi, trang: 1 });
  }

  // Xóa đối tác cuối của một trang (hoặc sửa loại) làm trang đang xem biến mất.
  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;
  useEffect(() => {
    if (danhSach.isPending || danhSach.isFetching) return;
    if (boLoc.trang > 1 && dong.length === 0) dieuHuong({ ...boLoc, trang: 1 });
    // `boLoc` dựng lại mỗi lần render nên chỉ theo dõi các giá trị thật sự đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSach.isPending, danhSach.isFetching, dong.length, boLoc.trang]);

  const cot: ColumnsType<DongDoiTac> = [
    {
      title: "Mã",
      dataIndex: "ma",
      width: 130,
      fixed: "left",
      render: (ma: string, d) => <Link href={`/doi-tac/${d.id}`}>{ma}</Link>,
    },
    { title: "Tên đối tác", dataIndex: "ten", width: 260, ellipsis: true },
    {
      title: "Loại",
      dataIndex: "loai",
      width: 130,
      render: (loai: DongDoiTac["loai"]) => (
        <Tag color={MAU_LOAI_DOI_TAC[loai]}>{NHAN_LOAI_DOI_TAC[loai]}</Tag>
      ),
    },
    { title: "Điện thoại", dataIndex: "dien_thoai", width: 130 },
    { title: "Địa chỉ", dataIndex: "dia_chi", width: 240, ellipsis: true },
    {
      title: "Trạng thái",
      dataIndex: "dang_hoat_dong",
      width: 110,
      render: (hoatDong: boolean) => <Tag>{hoatDong ? "Đang dùng" : "Ngừng"}</Tag>,
    },
    ...(coQuyenSua
      ? [
          {
            title: "",
            key: "thao_tac",
            width: 70,
            fixed: "right" as const,
            render: (_: unknown, d: DongDoiTac) => (
              <Button
                type="link"
                size="small"
                className="px-0"
                onClick={() => setNganKeo({ mo: true, id: d.id })}
              >
                Sửa
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <BoCucDanhSach
        panelLoc={<PanelLocDoiTac boLoc={boLoc} onDoi={doiBoLoc} />}
        thanhCongCu={
          <ThanhCongCuDoiTac
            boLoc={boLoc}
            coQuyenSua={coQuyenSua}
            onDoi={doiBoLoc}
            onThem={() => setNganKeo({ mo: true, id: null })}
          />
        }
        soDieuKien={demDieuKienDoiTac(boLoc)}
      >
        <QueryState
          query={danhSach}
          laRong={(d) => d.dong.length === 0}
          moTaRong={
            coLoc(boLoc) ? (
              <div className="flex flex-col items-center gap-3">
                <span>Không có đối tác khớp bộ lọc. Xóa bớt điều kiện tìm.</span>
                <Button size="small" onClick={() => dieuHuong(BO_LOC_DOI_TAC_MAC_DINH)}>
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              "Chưa có đối tác nào. Bấm “Thêm đối tác” để tạo nhà cung cấp hoặc khách hàng đầu tiên."
            )
          }
        >
          {(d) => (
            <Table<DongDoiTac>
              rowKey="id"
              size="small"
              columns={cot}
              dataSource={d.dong}
              loading={danhSach.isFetching}
              scroll={{ x: 900 }}
              summary={() => (
                <HangTongCong
                  cot={cot}
                  coChon={false}
                  nhan={`Tổng cộng — ${tong.toLocaleString("vi-VN")} đối tác`}
                />
              )}
              pagination={{
                current: boLoc.trang,
                pageSize: KICH_THUOC_TRANG,
                total: tong,
                showSizeChanger: false,
                showTotal: (t) => `${t} đối tác`,
                onChange: (trang) => dieuHuong({ ...boLoc, trang }),
              }}
            />
          )}
        </QueryState>
      </BoCucDanhSach>

      <NganKeoDoiTac
        id={nganKeo.id}
        open={nganKeo.mo}
        onDong={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
