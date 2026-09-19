"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { SummaryRow } from "@/shared/components/summary-row";
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

const PAGE_SIZES = 50;

function coLoc(b: BoLocDoiTac): boolean {
  return b.q !== "" || b.loai !== null || b.hoatDong !== BO_LOC_DOI_TAC_MAC_DINH.hoatDong;
}

export function BangDoiTac({ coQuyenSua }: { coQuyenSua: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = docBoLocDoiTac(searchParams);
  const danhSach = useDanhSachDoiTac(filter);
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

  // Đổi bất kỳ điều kiện nào cũng về page 1: giữ nguyên page cũ thì rất dễ
  // rơi vào page trống và tưởng là không có dữ liệu.
  function doiBoLoc(thayDoi: Partial<BoLocDoiTac>) {
    dieuHuong({ ...filter, ...thayDoi, page: 1 });
  }

  // Xóa đối tác cuối của một page (hoặc sửa loại) làm page đang xem biến mất.
  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;
  useEffect(() => {
    if (danhSach.isPending || danhSach.isFetching) return;
    if (filter.page > 1 && dong.length === 0) dieuHuong({ ...filter, page: 1 });
    // `filter` dựng lại mỗi lần render nên chỉ theo dõi các giá trị thật sự đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSach.isPending, danhSach.isFetching, dong.length, filter.page]);

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
      <ListLayout
        filterPanel={<PanelLocDoiTac filter={filter} onDoi={doiBoLoc} />}
        toolbar={
          <ThanhCongCuDoiTac
            filter={filter}
            coQuyenSua={coQuyenSua}
            onDoi={doiBoLoc}
            onThem={() => setNganKeo({ mo: true, id: null })}
          />
        }
        activeFilterCount={demDieuKienDoiTac(filter)}
      >
        <QueryState
          query={danhSach}
          isEmpty={(d) => d.dong.length === 0}
          emptyDescription={
            coLoc(filter) ? (
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
                <SummaryRow
                  columns={cot}
                  hasSelection={false}
                  label={`Tổng cộng — ${tong.toLocaleString("vi-VN")} đối tác`}
                />
              )}
              pagination={{
                current: filter.page,
                pageSize: PAGE_SIZES,
                total: tong,
                showSizeChanger: false,
                showTotal: (t) => `${t} đối tác`,
                onChange: (page) => dieuHuong({ ...filter, page }),
              }}
            />
          )}
        </QueryState>
      </ListLayout>

      <NganKeoDoiTac
        id={nganKeo.id}
        open={nganKeo.mo}
        onClose={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
