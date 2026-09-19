"use client";

import { Button, Space, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type { BoLocSanPham, CotSapXep } from "../schemas/bo-loc.schema";
import type { DanhMucPhu, DongSanPham } from "../types";
import { OSuaNhanh } from "./o-sua-nhanh";

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
  danhMucPhu: DanhMucPhu | undefined;
  onSua: (id: string) => void;
};

export function taoCot({
  boLoc,
  xemGiaVon,
  sua,
  danhMucPhu,
  onSua,
}: ThamSo): TableColumnsType<DongSanPham> {
  const chonNhom = [
    { value: "", label: "(không nhóm)" },
    ...(danhMucPhu?.nhomHang ?? []).map((n) => ({ value: n.id, label: n.ten })),
  ];
  const chonDvt = (danhMucPhu?.donViTinh ?? []).map((d) => ({ value: d.id, label: d.ten }));
  const chonCongDoan = (danhMucPhu?.congDoan ?? []).map((c) => ({
    value: c.id,
    label: c.ten,
  }));

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
    {
      title: "Nhóm hàng",
      dataIndex: "ten_nhom_hang",
      width: 180,
      ellipsis: true,
      render: (ten: string | null, d) => (
        <OSuaNhanh
          sanPhamId={d.id}
          truong="nhom_hang_id"
          choPhep={sua}
          tuyChon={chonNhom}
          label={ten ?? <span className="text-gray-400">(không nhóm)</span>}
        />
      ),
    },
    {
      title: "ĐVT",
      dataIndex: "ten_dvt",
      width: 110,
      render: (ten: string, d) => (
        <OSuaNhanh
          sanPhamId={d.id}
          truong="dvt_id"
          choPhep={sua}
          tuyChon={chonDvt}
          label={ten}
        />
      ),
    },
    {
      title: "Công đoạn",
      dataIndex: "ten_cong_doan",
      width: 140,
      render: (ten: string, d) => (
        <OSuaNhanh
          sanPhamId={d.id}
          truong="cong_doan_id"
          choPhep={sua}
          tuyChon={chonCongDoan}
          label={ten ? <Tag color={d.mau_cong_doan || undefined}>{ten}</Tag> : "—"}
        />
      ),
    },
    {
      title: "Tồn",
      dataIndex: "tong_ton",
      key: "tong_ton",
      width: 100,
      align: "right",
      className: "tabular-nums",
      sorter: true,
      sortOrder: huongSap(boLoc, "tong_ton"),
      render: (ton: number) =>
        Number(ton) === 0 ? (
          <Typography.Text type="secondary">0</Typography.Text>
        ) : (
          soVn(ton)
        ),
    },
    {
      title: "Giá bán",
      dataIndex: "gia_ban",
      width: 110,
      align: "right",
      className: "tabular-nums",
      render: soVn,
    },
    ...(xemGiaVon
      ? [
          {
            title: "Giá vốn",
            dataIndex: "gia_von",
            width: 110,
            align: "right" as const,
            className: "tabular-nums",
            render: soVn,
          },
        ]
      : []),
    {
      title: "Trạng thái",
      key: "trang_thai",
      width: 190,
      render: (_: unknown, d: DongSanPham) => (
        <Space size={4} wrap>
          {d.dang_kinh_doanh ? null : <Tag>Ngừng KD</Tag>}
          {d.can_ra_dvt ? (
            <Tooltip title="Ô ĐVT gốc KiotViet khác tên/đuôi mã — kiểm tra ĐVT và công đoạn">
              <Tag color="red">ĐVT mâu thuẫn</Tag>
            </Tooltip>
          ) : d.can_ra ? (
            <Tag color="orange">Cần rà</Tag>
          ) : null}
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
