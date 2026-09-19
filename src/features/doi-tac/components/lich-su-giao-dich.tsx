"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useLichSuGiaoDich } from "../hooks/useDoiTac";
import type { DongLichSuGiaoDich } from "../types";

const NHAN_NGUON: Record<string, { label: string; mau?: string }> = {
  HE_THONG: { label: "Hệ thống", mau: "green" },
  KIOTVIET_NHAP: { label: "KiotViet · nhập" },
  KIOTVIET_BAN: { label: "KiotViet · bán" },
};

const NHAN_LOAI: Record<string, string> = { NHAP: "Nhập", XUAT: "Xuất" };

function so(v: number | string | null): string {
  return v === null ? "—" : Number(v).toLocaleString("vi-VN");
}

export function LichSuGiaoDich({ doiTacId }: { doiTacId: string }) {
  const [page, setTrang] = useState(1);
  const lichSu = useLichSuGiaoDich(doiTacId, page);

  const cot: ColumnsType<DongLichSuGiaoDich> = [
    {
      title: "Ngày",
      dataIndex: "ngay",
      width: 130,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "Nguồn",
      dataIndex: "nguon",
      width: 140,
      render: (v: string) => {
        const n = NHAN_NGUON[v] ?? { label: v };
        return <Tag color={n.mau}>{n.label}</Tag>;
      },
    },
    { title: "Số phiếu", dataIndex: "ma_phieu", width: 150 },
    {
      title: "Loại",
      dataIndex: "loai",
      width: 90,
      render: (v: string) => NHAN_LOAI[v] ?? v,
    },
    { title: "Số dòng", dataIndex: "so_dong", width: 90, align: "right", render: so },
    {
      title: "Tổng số lượng",
      dataIndex: "tong_so_luong",
      width: 130,
      align: "right",
      render: so,
    },
    { title: "Ghi chú", dataIndex: "ghi_chu", ellipsis: true },
  ];

  return (
    <QueryState
      query={lichSu}
      isEmpty={(d) => d.dong.length === 0}
      emptyDescription="Chưa có giao dịch. Với khách hàng tạo từ Rà ghi chú, hóa đơn KiotViet hiện ở đây sau khi gán ghi chú cho khách."
    >
      {(d) => (
        <div className="overflow-x-auto">
          <Table<DongLichSuGiaoDich>
            rowKey={(r) => `${r.nguon}-${r.ma_phieu}-${r.ngay}`}
            size="small"
            columns={cot}
            dataSource={d.dong}
            loading={lichSu.isFetching && !lichSu.isPending}
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize: 50,
              total: d.tong,
              showSizeChanger: false,
              showTotal: (t) => `${t.toLocaleString("vi-VN")} phiếu`,
              onChange: setTrang,
            }}
          />
        </div>
      )}
    </QueryState>
  );
}
