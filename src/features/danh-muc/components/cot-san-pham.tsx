"use client";

import { Button, Space, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type { BoLocSanPham, CotSapXep } from "../schemas/bo-loc.schema";
import type { DongSanPham } from "../types";

/** Tiền và số lượng từ Postgres về có thể là string — chỉ dùng để HIỂN THỊ. */
export function soVn(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("vi-VN");
}

function huongSap(boLoc: BoLocSanPham, cot: CotSapXep) {
  if (boLoc.sapXep !== cot) return null;
  return boLoc.huong === "desc" ? ("descend" as const) : ("ascend" as const);
}

type ThamSo = {
  boLoc: BoLocSanPham;
  xemGiaVon: boolean;
  sua: boolean;
  onSua: (id: string) => void;
};

export function taoCot({ boLoc, xemGiaVon, sua, onSua }: ThamSo): TableColumnsType<DongSanPham> {
  return [
    {
      title: "Mã hàng",
      dataIndex: "ma_hang",
      key: "ma_hang",
      width: 170,
      fixed: "left",
      sorter: true,
      sortOrder: huongSap(boLoc, "ma_hang"),
      render: (ma: string, d) => (
        <Link href={`/danh-muc/${d.id}`} className="font-mono">
          {ma}
        </Link>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "ten_hang",
      key: "ten_hang",
      width: 280,
      ellipsis: true,
      sorter: true,
      sortOrder: huongSap(boLoc, "ten_hang"),
      render: (ten: string) => <Tooltip title={ten}>{ten}</Tooltip>,
    },
    { title: "Nhóm hàng", dataIndex: "ten_nhom_hang", width: 180, ellipsis: true },
    { title: "ĐVT", dataIndex: "ten_dvt", width: 90 },
    {
      title: "Công đoạn",
      dataIndex: "ten_cong_doan",
      width: 120,
      render: (ten: string, d) =>
        ten ? <Tag color={d.mau_cong_doan || undefined}>{ten}</Tag> : null,
    },
    {
      title: "Tồn",
      dataIndex: "tong_ton",
      key: "tong_ton",
      width: 100,
      align: "right",
      sorter: true,
      sortOrder: huongSap(boLoc, "tong_ton"),
      render: (ton: number) =>
        Number(ton) === 0 ? (
          <Typography.Text type="secondary">0</Typography.Text>
        ) : (
          soVn(ton)
        ),
    },
    { title: "Giá bán", dataIndex: "gia_ban", width: 110, align: "right", render: soVn },
    ...(xemGiaVon
      ? [
          {
            title: "Giá vốn",
            dataIndex: "gia_von",
            width: 110,
            align: "right" as const,
            render: soVn,
          },
        ]
      : []),
    {
      title: "Trạng thái",
      key: "trang_thai",
      width: 140,
      render: (_: unknown, d: DongSanPham) => (
        <Space size={4}>
          {d.dang_kinh_doanh ? null : <Tag>Ngừng KD</Tag>}
          {d.can_ra ? <Tag color="orange">Cần rà</Tag> : null}
        </Space>
      ),
    },
    ...(sua
      ? [
          {
            title: "",
            key: "thao_tac",
            width: 70,
            fixed: "right" as const,
            render: (_: unknown, d: DongSanPham) => (
              <Button type="link" size="small" className="px-0" onClick={() => onSua(d.id)}>
                Sửa
              </Button>
            ),
          },
        ]
      : []),
  ];
}
