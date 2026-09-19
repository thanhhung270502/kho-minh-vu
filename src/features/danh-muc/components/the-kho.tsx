"use client";

import { Alert, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useDanhMucPhu, useTheKho } from "../hooks/useSanPham";
import type { DongTheKho } from "../types";
import { soVn } from "./cot-san-pham";

const NHAN_NGUON: Record<string, { label: string; mau?: string }> = {
  HE_THONG: { label: "Hệ thống", mau: "green" },
  KIOTVIET_NHAP: { label: "KiotViet · nhập" },
  KIOTVIET_BAN: { label: "KiotViet · bán" },
};

export function TheKho({
  sanPhamId,
  xemGiaVon,
}: {
  sanPhamId: string;
  xemGiaVon: boolean;
}) {
  // antd cảnh báo khi option có `value: null` — dùng chuỗi rỗng làm "tất cả",
  // đổi về null ngay khi gọi API.
  const [khoId, setKhoId] = useState<string>("");
  const [trang, setTrang] = useState(1);
  const danhMucPhu = useDanhMucPhu();
  const theKho = useTheKho(sanPhamId, khoId || null, trang);

  const cot: ColumnsType<DongTheKho> = [
    {
      title: "Ngày giờ",
      dataIndex: "ngay",
      width: 150,
      render: (v: string) => dayjs(v).format("HH:mm DD/MM/YYYY"),
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
    { title: "Số phiếu", dataIndex: "so_ct", width: 140 },
    { title: "Kho", dataIndex: "ten_kho", width: 110 },
    { title: "Đối tác / Ghi chú", key: "doi_tac", ellipsis: true, render: (_, d) => d.doi_tac || d.ghi_chu },
    {
      title: "Nhập",
      dataIndex: "so_luong_nhap",
      width: 100,
      align: "right",
      render: (v: number) =>
        Number(v) ? <span className="text-green-600">{soVn(v)}</span> : null,
    },
    {
      title: "Xuất",
      dataIndex: "so_luong_xuat",
      width: 100,
      align: "right",
      render: (v: number) =>
        Number(v) ? <span className="text-red-600">{soVn(v)}</span> : null,
    },
    ...(xemGiaVon
      ? [
          {
            title: "Giá vốn lúc đó",
            dataIndex: "gia_von_tai_thoi_diem",
            width: 130,
            align: "right" as const,
            render: soVn,
          },
        ]
      : []),
    {
      title: "",
      key: "dao",
      width: 120,
      render: (_: unknown, d: DongTheKho) =>
        d.la_but_toan_dao ? <Tag color="volcano">Bút toán đảo</Tag> : null,
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          className="w-52"
          value={khoId}
          onChange={(v) => {
            setKhoId(v);
            setTrang(1);
          }}
          options={[
            { value: "", label: "Tất cả kho" },
            ...(danhMucPhu.data?.kho ?? []).map((k) => ({ value: k.id, label: k.ten })),
          ]}
        />
      </div>

      {khoId ? (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Dữ liệu KiotViet cũ không gắn kho nên chỉ hiện khi xem “Tất cả kho”."
        />
      ) : null}

      <QueryState
        query={theKho}
        isEmpty={(d) => d.dong.length === 0}
        emptyDescription={
          khoId
            ? "Kho này chưa có biến động."
            : "Chưa có biến động nào. Thẻ kho ghi nhận từ phiếu nhập/xuất đầu tiên."
        }
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table<DongTheKho>
              rowKey={(r) => `${r.chung_tu_id}-${r.ngay}-${r.so_ct}-${r.so_luong_nhap}-${r.so_luong_xuat}`}
              size="small"
              columns={cot}
              dataSource={d.dong}
              loading={theKho.isFetching && !theKho.isPending}
              scroll={{ x: 1000 }}
              pagination={{
                current: trang,
                pageSize: 50,
                total: d.tong,
                showSizeChanger: false,
                showTotal: (t) => `${t.toLocaleString("vi-VN")} dòng`,
                onChange: setTrang,
              }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
