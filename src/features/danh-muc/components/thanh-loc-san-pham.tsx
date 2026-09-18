"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Select } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  BO_LOC_MAC_DINH,
  type BoLocSanPham,
  type TrangThaiTon,
} from "../schemas/bo-loc.schema";
import type { DanhMucPhu } from "../types";

type Props = {
  boLoc: BoLocSanPham;
  danhMucPhu: DanhMucPhu | undefined;
  onDoi: (b: BoLocSanPham) => void;
  hanhDongPhu?: ReactNode;
  nutThem?: ReactNode;
};

const TON: Array<{ value: TrangThaiTon; label: string }> = [
  { value: "con_hang", label: "Còn hàng" },
  { value: "het_hang", label: "Hết hàng" },
  { value: "am", label: "Tồn âm" },
  { value: "duoi_dinh_muc", label: "Dưới định mức" },
];

const KINH_DOANH = [
  { value: "dang", label: "Đang kinh doanh" },
  { value: "ngung", label: "Ngừng kinh doanh" },
  { value: "tat_ca", label: "Tất cả" },
];

function khacMacDinh(b: BoLocSanPham): boolean {
  return (
    b.q !== "" ||
    b.nhomHangId !== null ||
    b.congDoanId !== null ||
    b.dvtId !== null ||
    b.trangThaiTon !== null ||
    b.canRa ||
    b.kinhDoanh !== BO_LOC_MAC_DINH.kinhDoanh
  );
}

export function ThanhLocSanPham({ boLoc, danhMucPhu, onDoi, hanhDongPhu, nutThem }: Props) {
  const [tuKhoa, setTuKhoa] = useState(boLoc.q);
  const [qTruoc, setQTruoc] = useState(boLoc.q);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (xem SUMMARY plan 13).
  if (boLoc.q !== qTruoc) {
    setQTruoc(boLoc.q);
    setTuKhoa(boLoc.q);
  }

  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); }, []);

  /** Mọi thay đổi điều kiện đều về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function doi(thayDoi: Partial<BoLocSanPham>) {
    onDoi({ ...boLoc, ...thayDoi, trang: 1 });
  }

  function goTim(v: string) {
    setTuKhoa(v);
    if (hen.current) clearTimeout(hen.current);
    hen.current = setTimeout(() => doi({ q: v.trim() }), 300);
  }

  function timNgay() {
    if (hen.current) clearTimeout(hen.current);
    doi({ q: tuKhoa.trim() });
  }

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          allowClear
          autoFocus
          value={tuKhoa}
          prefix={<SearchOutlined />}
          placeholder="Mã hoặc tên hàng — vd: op po air blade"
          className="w-full sm:max-w-md"
          onChange={(e) => goTim(e.target.value)}
          onPressEnter={timNgay}
        />
        <div className="ms-auto flex gap-2">
          {hanhDongPhu}
          {nutThem}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-56"
          placeholder="Nhóm hàng"
          value={boLoc.nhomHangId}
          options={(danhMucPhu?.nhomHang ?? []).map((n) => ({ value: n.id, label: n.ten }))}
          onChange={(v) => doi({ nhomHangId: v ?? null })}
        />

        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-48"
          placeholder="Công đoạn"
          value={boLoc.congDoanId}
          options={(danhMucPhu?.congDoan ?? []).map((c) => ({
            value: c.id,
            label: c.ten,
          }))}
          optionRender={(o) => {
            const mau = danhMucPhu?.congDoan.find((c) => c.id === o.value)?.mau_hien_thi;
            return (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: mau ?? "transparent" }}
                />
                {o.label}
              </span>
            );
          }}
          onChange={(v) => doi({ congDoanId: v ?? null })}
        />

        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-40"
          placeholder="Đơn vị tính"
          value={boLoc.dvtId}
          options={(danhMucPhu?.donViTinh ?? []).map((d) => ({ value: d.id, label: d.ten }))}
          onChange={(v) => doi({ dvtId: v ?? null })}
        />

        <Select
          allowClear
          className="w-40"
          placeholder="Tồn"
          value={boLoc.trangThaiTon}
          options={TON}
          onChange={(v) => doi({ trangThaiTon: v ?? null })}
        />

        <Select
          className="w-44"
          value={boLoc.kinhDoanh}
          options={KINH_DOANH}
          onChange={(v) => doi({ kinhDoanh: v })}
        />

        {khacMacDinh(boLoc) ? (
          <Button onClick={() => onDoi({ ...BO_LOC_MAC_DINH, kichThuoc: boLoc.kichThuoc })}>
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </div>
  );
}
