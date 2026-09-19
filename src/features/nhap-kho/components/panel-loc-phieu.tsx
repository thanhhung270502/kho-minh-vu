"use client";

import { Button, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { useDanhSachDoiTac } from "@/features/doi-tac/hooks/useDoiTac";
import { BO_LOC_DOI_TAC_MAC_DINH } from "@/features/doi-tac/types";

import {
  BO_LOC_PHIEU_MAC_DINH,
  demDieuKienPhieu,
  type BoLocPhieu,
} from "../schemas/phieu-nhap.schema";
import { NHAN_NGUON_NHAP, NHAN_TRANG_THAI } from "../types";

function NhomLoc({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-chu-phu">{label}</label>
      {children}
    </div>
  );
}

export function PanelLocPhieu({
  filter,
  onDoi,
}: {
  filter: BoLocPhieu;
  onDoi: (b: BoLocPhieu) => void;
}) {
  const lookups = useLookups();
  // Danh sách NCC đang hoạt động — dùng lại RPC đối tác của Phase 2.
  const ncc = useDanhSachDoiTac({ ...BO_LOC_DOI_TAC_MAC_DINH, loai: "NCC" });

  /** Đổi điều kiện nào cũng về page 1 — giữ page cũ dễ rơi vào page trống. */
  function doi(thayDoi: Partial<BoLocPhieu>) {
    onDoi({ ...filter, ...thayDoi, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3">
      <NhomLoc label="Trạng thái">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.trangThai}
          options={(["NHAP_LIEU", "HOAN_THANH", "DA_HUY"] as const).map((t) => ({
            value: t,
            label: NHAN_TRANG_THAI[t],
          }))}
          onChange={(v) => doi({ trangThai: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc label="Nhà cung cấp">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Tất cả"
          value={filter.doiTacId}
          loading={ncc.isPending}
          options={(ncc.data?.dong ?? []).map((d) => ({ value: d.id, label: d.ten }))}
          onChange={(v) => doi({ doiTacId: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc label="Nguồn nhập">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.nguonNhap}
          options={(["NCC", "NHA_MAY"] as const).map((n) => ({
            value: n,
            label: NHAN_NGUON_NHAP[n],
          }))}
          onChange={(v) => doi({ nguonNhap: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc label="Kho">
        <Select
          allowClear
          className="w-full"
          placeholder="Tất cả"
          value={filter.khoId}
          options={(lookups.data?.kho ?? []).map((k) => ({ value: k.id, label: k.ten }))}
          onChange={(v) => doi({ khoId: v ?? null })}
        />
      </NhomLoc>

      <NhomLoc label="Khoảng ngày">
        <DatePicker.RangePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={
            filter.tuNgay && filter.denNgay
              ? [dayjs(filter.tuNgay), dayjs(filter.denNgay)]
              : null
          }
          onChange={(v) =>
            doi({
              tuNgay: v?.[0] ? v[0].format("YYYY-MM-DD") : null,
              denNgay: v?.[1] ? v[1].format("YYYY-MM-DD") : null,
            })
          }
        />
      </NhomLoc>

      {demDieuKienPhieu(filter) > 0 ? (
        <Button onClick={() => onDoi({ ...BO_LOC_PHIEU_MAC_DINH, q: filter.q })}>
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}
