"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { KICH_THUOC_PHIEU, type BoLocPhieu } from "../schemas/phieu-nhap.schema";
import {
  MAU_NGUON_NHAP,
  MAU_TRANG_THAI,
  NHAN_NGUON_NHAP,
  NHAN_TRANG_THAI,
  type DongDanhSachPhieu,
} from "../types";

function so(v: number | string | null): string {
  return v === null ? "—" : Number(v).toLocaleString("vi-VN");
}

const COT: TableColumnsType<DongDanhSachPhieu> = [
  {
    title: "Số phiếu",
    dataIndex: "so_ct",
    width: 150,
    fixed: "left",
    render: (v: string, d) => (
      <Link href={`/nhap-kho/${d.id}`} className="font-mono">
        {v}
      </Link>
    ),
  },
  {
    title: "Ngày",
    dataIndex: "ngay_ct",
    width: 110,
    render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
  },
  {
    title: "Nguồn",
    dataIndex: "nguon_nhap",
    width: 110,
    render: (v: DongDanhSachPhieu["nguon_nhap"]) =>
      v ? <Tag color={MAU_NGUON_NHAP[v]}>{NHAN_NGUON_NHAP[v]}</Tag> : null,
  },
  { title: "Nhà cung cấp", dataIndex: "ten_doi_tac", width: 240, ellipsis: true },
  { title: "Kho", dataIndex: "ten_kho", width: 110 },
  { title: "Số dòng", dataIndex: "so_dong", width: 90, align: "right", render: so },
  {
    title: "Tổng số lượng",
    dataIndex: "tong_so_luong",
    width: 130,
    align: "right",
    render: so,
  },
  {
    title: "Trạng thái",
    dataIndex: "trang_thai",
    width: 140,
    render: (v: DongDanhSachPhieu["trang_thai"]) => (
      <Tag color={MAU_TRANG_THAI[v]}>{NHAN_TRANG_THAI[v]}</Tag>
    ),
  },
  { title: "Người tạo", dataIndex: "ho_ten_nguoi_tao", width: 160, ellipsis: true },
];

type Props = {
  dong: DongDanhSachPhieu[];
  tong: number;
  filter: BoLocPhieu;
  dangTai: boolean;
  onDoiBoLoc: (b: BoLocPhieu) => void;
};

export function NoiDungBangPhieu({ dong, tong, filter, dangTai, onDoiBoLoc }: Props) {
  return (
    <Table<DongDanhSachPhieu>
      rowKey="id"
      size="small"
      sticky
      columns={COT}
      dataSource={dong}
      loading={dangTai}
      scroll={{ x: 1000 }}
      pagination={{
        current: filter.page,
        pageSize: KICH_THUOC_PHIEU,
        total: tong,
        showSizeChanger: false,
        showTotal: (t) => `${t.toLocaleString("vi-VN")} phiếu`,
        onChange: (page) => onDoiBoLoc({ ...filter, page }),
      }}
    />
  );
}
