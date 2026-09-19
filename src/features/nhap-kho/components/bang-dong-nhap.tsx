"use client";

import { Alert, App, Button, InputNumber, Select, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { InputNumberRef } from "@rc-component/input-number";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { SummaryRow } from "@/shared/components/summary-row";
import { explainError } from "@/shared/lib/errors";

import { useSuaDong, useThemDong, useXoaDong } from "../hooks/usePhieuNhap";
import type { ChiTietPhieu, DongPhieu } from "../types";
import { OTimMaHang, type MaHangTim } from "./o-tim-ma-hang";

function so(v: number | string | null): string {
  return v === null ? "" : Number(v).toLocaleString("vi-VN");
}

type Props = { phieu: ChiTietPhieu; dong: DongPhieu[]; coQuyenSua: boolean };

/**
 * Luồng bàn phím (D-07): gõ mã → Enter → ô số lượng → Enter → ô đơn giá →
 * Enter là lưu dòng và quay về ô mã. 7,6 dòng mỗi phiếu, phiếu lớn nhất 48 dòng.
 */
export function BangDongNhap({ phieu, dong, coQuyenSua }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const themDong = useThemDong(phieu.id);
  const suaDong = useSuaDong(phieu.id);
  const xoaDong = useXoaDong(phieu.id);

  const [moi, setMoi] = useState<{
    sp: MaHangTim | null;
    so_luong: number | null;
    don_gia: number | null;
    kho_id: string | null;
  }>({ sp: null, so_luong: null, don_gia: null, kho_id: null });

  const oMa = useRef<RefSelectProps>(null);
  const oSoLuong = useRef<InputNumberRef>(null);
  const oDonGia = useRef<InputNumberRef>(null);

  const sanSang = phieu.trang_thai === "NHAP_LIEU" && coQuyenSua;
  const kho = lookups.data?.kho ?? [];
  const nhieuKho = kho.length > 1;

  async function luuDongMoi() {
    if (!moi.sp || !moi.so_luong || moi.so_luong <= 0) {
      message.warning("Nhập mã hàng và số lượng lớn hơn 0.");
      return;
    }

    try {
      await themDong.mutateAsync({
        san_pham_id: moi.sp.id,
        so_luong: moi.so_luong,
        don_gia: moi.don_gia ?? 0,
        kho_id: moi.kho_id,
      });
      setMoi({ sp: null, so_luong: null, don_gia: null, kho_id: null });
      // Hẹn sang lượt sau: focus ngay lúc này sẽ bị chính vòng render dọn bảng
      // xoá đi, con trỏ rơi về ô đơn giá và mã kế tiếp gõ vào nhầm chỗ.
      setTimeout(() => oMa.current?.focus(), 0);
    } catch (e) {
      const l = explainError(e);
      message.error(`${l.title}. ${l.action}`);
    }
  }

  async function suaO(id: string, giaTri: { so_luong?: number; don_gia?: number; kho_id?: string | null }) {
    try {
      const cu = dong.find((d) => d.id === id);
      await suaDong.mutateAsync({
        id,
        giaTri: {
          so_luong: giaTri.so_luong ?? Number(cu?.so_luong ?? 0),
          don_gia: giaTri.don_gia ?? Number(cu?.don_gia ?? 0),
          ...(giaTri.kho_id !== undefined ? { kho_id: giaTri.kho_id } : {}),
        },
      });
    } catch (e) {
      const l = explainError(e);
      message.error(`${l.title}. ${l.action}`);
    }
  }

  const cot: TableColumnsType<DongPhieu> = [
    {
      title: "Mã hàng",
      dataIndex: "ma_hang",
      key: "ma_hang",
      width: 160,
      render: (v: string) => <span className="font-mono">{v}</span>,
    },
    { title: "Tên hàng", dataIndex: "ten_hang", key: "ten_hang", ellipsis: true },
    { title: "ĐVT", dataIndex: "ten_dvt", key: "ten_dvt", width: 90 },
    ...(nhieuKho
      ? [
          {
            title: "Kho",
            dataIndex: "ten_kho",
            key: "ten_kho",
            width: 130,
            render: (ten: string, d: DongPhieu) =>
              sanSang ? (
                <Select
                  size="small"
                  className="w-full"
                  value={d.kho_id}
                  options={kho.map((k) => ({ value: k.id, label: k.ten }))}
                  onChange={(v) => void suaO(d.id, { kho_id: v })}
                />
              ) : (
                ten
              ),
          },
        ]
      : []),
    {
      title: "Số lượng",
      dataIndex: "so_luong",
      key: "so_luong",
      width: 120,
      align: "right",
      render: (v: number, d: DongPhieu) =>
        sanSang ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(v)}
            onBlur={(e) => {
              const n = Number(e.target.value.replace(/[^\d.-]/g, ""));
              if (Number.isFinite(n) && n !== Number(v)) void suaO(d.id, { so_luong: n });
            }}
          />
        ) : (
          so(v)
        ),
    },
    {
      title: "Đơn giá",
      dataIndex: "don_gia",
      key: "don_gia",
      width: 140,
      align: "right",
      render: (v: number, d: DongPhieu) =>
        sanSang ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(v)}
            formatter={(x) => (x === undefined ? "" : so(x))}
            parser={(x) => Number((x ?? "").replace(/\D/g, ""))}
            onBlur={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              if (Number.isFinite(n) && n !== Number(v)) void suaO(d.id, { don_gia: n });
            }}
          />
        ) : (
          so(v)
        ),
    },
    {
      title: "Thành tiền",
      key: "thanh_tien",
      dataIndex: "thanh_tien",
      width: 140,
      align: "right",
      // Tính khi render, KHÔNG giữ state (CLAUDE.md Bước 6).
      render: (_: unknown, d: DongPhieu) => so(Number(d.so_luong) * Number(d.don_gia)),
    },
    ...(sanSang
      ? [
          {
            title: "",
            key: "xoa",
            width: 60,
            align: "right" as const,
            render: (_: unknown, d: DongPhieu) => (
              <Button
                type="link"
                size="small"
                danger
                className="px-0"
                onClick={() => void xoaDong.mutateAsync(d.id)}
              >
                Xóa
              </Button>
            ),
          },
        ]
      : []),
  ];

  const tongSoLuong = dong.reduce((t, d) => t + Number(d.so_luong), 0);
  const tongTien = dong.reduce((t, d) => t + Number(d.so_luong) * Number(d.don_gia), 0);
  const dongThieuGia = dong.filter((d) => Number(d.don_gia) <= 0);

  return (
    <>
      {dongThieuGia.length > 0 && sanSang ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title={`${dongThieuGia.length} dòng chưa có đơn giá`}
          description={`Ghi sổ sẽ bị chặn cho tới khi điền đơn giá: ${dongThieuGia
            .slice(0, 3)
            .map((d) => d.ma_hang)
            .join(", ")}${dongThieuGia.length > 3 ? "…" : ""}`}
        />
      ) : null}

      <div className="overflow-x-auto">
        <Table<DongPhieu>
          rowKey="id"
          size="small"
          columns={cot}
          dataSource={dong}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô bên dưới để thêm." }}
          summary={() =>
            dong.length > 0 ? (
              <SummaryRow
                columns={cot}
                hasSelection={false}
                label={`Tổng cộng — ${dong.length} dòng`}
                totals={{ so_luong: tongSoLuong, thanh_tien: tongTien }}
              />
            ) : null
          }
        />
      </div>

      {sanSang ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-the bg-nen-tong p-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-[13px] text-chu-phu">Mã hàng</label>
            <OTimMaHang
              oRef={oMa}
              disabled={themDong.isPending}
              onChon={(sp) => {
                setMoi((m) => ({ ...m, sp, kho_id: m.kho_id ?? null }));
                setTimeout(() => oSoLuong.current?.focus(), 0);
              }}
            />
          </div>

          {nhieuKho ? (
            <div className="w-36">
              <label className="mb-1 block text-[13px] text-chu-phu">Kho</label>
              <Select
                className="w-full"
                placeholder={phieu.ten_kho ?? "Kho phiếu"}
                allowClear
                value={moi.kho_id}
                options={kho.map((k) => ({ value: k.id, label: k.ten }))}
                onChange={(v) => setMoi((m) => ({ ...m, kho_id: v ?? null }))}
              />
            </div>
          ) : null}

          <div className="w-28">
            <label className="mb-1 block text-[13px] text-chu-phu">Số lượng</label>
            <InputNumber
              ref={oSoLuong}
              className="w-full"
              min={0}
              value={moi.so_luong}
              onChange={(v) => setMoi((m) => ({ ...m, so_luong: v }))}
              onPressEnter={(e) => {
                e.preventDefault();
                oDonGia.current?.focus();
              }}
            />
          </div>

          <div className="w-36">
            <label className="mb-1 block text-[13px] text-chu-phu">Đơn giá</label>
            <InputNumber
              ref={oDonGia}
              className="w-full"
              min={0}
              value={moi.don_gia}
              formatter={(x) => (x === undefined ? "" : so(x))}
              parser={(x) => Number((x ?? "").replace(/\D/g, ""))}
              onChange={(v) => setMoi((m) => ({ ...m, don_gia: v }))}
              onPressEnter={(e) => {
                e.preventDefault();
                void luuDongMoi();
              }}
            />
          </div>

          <Button type="primary" loading={themDong.isPending} onClick={() => void luuDongMoi()}>
            Thêm dòng
          </Button>

          <Typography.Text type="secondary" className="w-full text-xs">
            Gõ mã → Enter → số lượng → Enter → đơn giá → Enter là xong một dòng.
          </Typography.Text>
        </div>
      ) : null}
    </>
  );
}
