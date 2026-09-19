"use client";

import { Button, Select } from "antd";
import type { ReactNode } from "react";

import {
  BO_LOC_MAC_DINH,
  demDieuKien,
  type BoLocSanPham,
  type TrangThaiTon,
} from "../schemas/bo-loc.schema";
import type { DanhMucPhu } from "../types";

type Props = {
  boLoc: BoLocSanPham;
  danhMucPhu: DanhMucPhu | undefined;
  onDoi: (b: BoLocSanPham) => void;
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

function NhomLoc({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{nhan}</label>
      {children}
    </div>
  );
}

export function PanelLocSanPham({ boLoc, danhMucPhu, onDoi }: Props) {
  /** Mọi thay đổi điều kiện đều về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function doi(thayDoi: Partial<BoLocSanPham>) {
    onDoi({ ...boLoc, ...thayDoi, trang: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <NhomLoc nhan="Nhóm hàng">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Nhóm hàng"
          value={boLoc.nhomHangId}
          options={(danhMucPhu?.nhomHang ?? []).map((n) => ({ value: n.id, label: n.ten }))}
          onChange={(v) => doi({ nhomHangId: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc nhan="Công đoạn">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
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
      </NhomLoc>

      <NhomLoc nhan="Đơn vị tính">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Đơn vị tính"
          value={boLoc.dvtId}
          options={(danhMucPhu?.donViTinh ?? []).map((d) => ({ value: d.id, label: d.ten }))}
          onChange={(v) => doi({ dvtId: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc nhan="Tồn">
        <Select
          allowClear
          className="w-full"
          placeholder="Tồn"
          value={boLoc.trangThaiTon}
          options={TON}
          onChange={(v) => doi({ trangThaiTon: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc nhan="Kinh doanh">
        <Select
          className="w-full"
          value={boLoc.kinhDoanh}
          options={KINH_DOANH}
          onChange={(v) => doi({ kinhDoanh: v })}
        />
      </NhomLoc>

      <Button
        block
        disabled={demDieuKien(boLoc) === 0}
        onClick={() => onDoi({ ...BO_LOC_MAC_DINH, kichThuoc: boLoc.kichThuoc })}
      >
        Xóa bộ lọc
      </Button>
    </div>
  );
}
