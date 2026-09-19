"use client";

import { Button, Segmented, Select } from "antd";
import type { ReactNode } from "react";

import { BO_LOC_DOI_TAC_MAC_DINH, demDieuKienDoiTac, NHAN_LOAI_DOI_TAC } from "../types";
import type { BoLocDoiTac, LoaiDoiTac } from "../types";

type Props = {
  boLoc: BoLocDoiTac;
  onDoi: (thayDoi: Partial<BoLocDoiTac>) => void;
};

const LOAI: Array<{ label: string; value: string }> = [
  { label: "Tất cả", value: "tat_ca" },
  ...(["NCC", "KHACH", "CA_HAI"] as LoaiDoiTac[]).map((l) => ({
    label: NHAN_LOAI_DOI_TAC[l],
    value: l,
  })),
];

const TRANG_THAI = [
  { label: "Đang hoạt động", value: "dang" },
  { label: "Ngừng hoạt động", value: "ngung" },
  { label: "Tất cả", value: "tat_ca" },
];

function NhomLoc({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{nhan}</label>
      {children}
    </div>
  );
}

export function PanelLocDoiTac({ boLoc, onDoi }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <NhomLoc nhan="Loại đối tác">
        <Segmented
          block
          vertical
          options={LOAI}
          value={boLoc.loai ?? "tat_ca"}
          onChange={(v) => onDoi({ loai: v === "tat_ca" ? null : (v as LoaiDoiTac) })}
        />
      </NhomLoc>

      <NhomLoc nhan="Trạng thái">
        <Select
          options={TRANG_THAI}
          value={boLoc.hoatDong}
          className="w-full"
          onChange={(v) => onDoi({ hoatDong: v })}
        />
      </NhomLoc>

      <Button
        block
        disabled={demDieuKienDoiTac(boLoc) === 0}
        onClick={() => onDoi(BO_LOC_DOI_TAC_MAC_DINH)}
      >
        Xóa bộ lọc
      </Button>
    </div>
  );
}
