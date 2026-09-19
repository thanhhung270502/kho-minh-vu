"use client";

import { Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { SorterResult } from "antd/es/table/interface";

import { SummaryRow } from "@/shared/components/summary-row";

import { COT_SAP_XEP, KICH_THUOC_TRANG, type BoLocSanPham, type CotSapXep } from "../schemas/bo-loc.schema";
import type { DongSanPham } from "../types";

type Props = {
  cot: TableColumnsType<DongSanPham>;
  dong: DongSanPham[];
  tong: number;
  boLoc: BoLocSanPham;
  hasSelection: boolean;
  chon: string[];
  onChonDoi: (keys: string[]) => void;
  dangTai: boolean;
  onDoiBoLoc: (b: BoLocSanPham) => void;
};

/** Bảng chính của /danh-muc + hàng tổng cộng + ghi chú tồn 0 toàn trang. */
export function NoiDungBangSanPham({
  cot,
  dong,
  tong,
  boLoc,
  hasSelection,
  chon,
  onChonDoi,
  dangTai,
  onDoiBoLoc,
}: Props) {
  const moiTonBang0 = dong.length > 0 && dong.every((d) => Number(d.tong_ton) === 0);

  function onBangDoi(
    trang: { current?: number; pageSize?: number },
    sorter: SorterResult<DongSanPham> | SorterResult<DongSanPham>[],
  ) {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const cotSap = s?.columnKey as CotSapXep | undefined;
    const hopLe = cotSap && COT_SAP_XEP.includes(cotSap);

    onDoiBoLoc({
      ...boLoc,
      trang: trang.current ?? 1,
      kichThuoc: trang.pageSize ?? boLoc.kichThuoc,
      sapXep: hopLe && s?.order ? cotSap : null,
      huong: s?.order === "descend" ? "desc" : "asc",
    });
  }

  return (
    <>
      <Table<DongSanPham>
        rowKey="id"
        size="small"
        sticky
        columns={cot}
        rowSelection={
          hasSelection
            ? {
                selectedRowKeys: chon,
                onChange: (keys) => onChonDoi(keys as string[]),
                // Chọn ở trang 1, sang trang 2 chọn tiếp: antd v6 chỉ giữ được
                // khóa ngoài trang hiện tại khi bật cờ này.
                preserveSelectedRowKeys: true,
              }
            : undefined
        }
        dataSource={dong}
        loading={dangTai}
        scroll={{ x: 1100 }}
        onChange={(p, _f, s) => onBangDoi(p, s)}
        summary={() => (
          <SummaryRow
            columns={cot}
            hasSelection={hasSelection}
            label={`Tổng cộng — ${tong.toLocaleString("vi-VN")} mã`}
            totals={{ tong_ton: dong.reduce((s, r) => s + Number(r.tong_ton ?? 0), 0) }}
          />
        )}
        pagination={{
          current: boLoc.trang,
          pageSize: boLoc.kichThuoc,
          total: tong,
          showSizeChanger: true,
          pageSizeOptions: [...KICH_THUOC_TRANG],
          showTotal: (t) => `${t.toLocaleString("vi-VN")} mã`,
        }}
      />

      {moiTonBang0 ? (
        <Typography.Text type="secondary" className="mt-2 block text-xs">
          Tồn đang bằng 0 cho mọi mã vì chưa có phiếu nhập — tồn thật được đặt khi kiểm kê
          đầu kỳ.
        </Typography.Text>
      ) : null}
    </>
  );
}
