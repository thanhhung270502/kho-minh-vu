"use client";

import { App, DatePicker, Descriptions, Input, Select, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { explainError } from "@/shared/lib/errors";

import { useSuaDauPhieu } from "../hooks/usePhieuNhap";
import {
  MAU_NGUON_NHAP,
  MAU_TRANG_THAI,
  NHAN_NGUON_NHAP,
  NHAN_TRANG_THAI,
  type ChiTietPhieu,
} from "../types";

type Props = { phieu: ChiTietPhieu; coQuyenSua: boolean };

/** Phiếu đã ghi sổ hoặc đã hủy thì chỉ đọc — khóa thật nằm ở policy 0016. */
export function DauPhieuNhap({ phieu, coQuyenSua }: Props) {
  const { message } = App.useApp();
  const sua = useSuaDauPhieu(phieu.id);
  const lookups = useLookups();
  const ncc = usePartners({ ...DEFAULT_PARTNER_FILTER, loai: "NCC" });
  const [vuaLuu, setVuaLuu] = useState<string | null>(null);

  const sanSang = phieu.trang_thai === "NHAP_LIEU" && coQuyenSua;

  async function luu(truong: string, giaTri: Record<string, unknown>) {
    try {
      await sua.mutateAsync(giaTri);
      setVuaLuu(truong);
      setTimeout(() => setVuaLuu(null), 2000);
    } catch (e) {
      const l = explainError(e);
      message.error(`${l.title}. ${l.action}`);
    }
  }

  function label(truong: string, chu: string) {
    return (
      <span className="flex items-center gap-2">
        {chu}
        {vuaLuu === truong ? (
          <Typography.Text type="secondary" className="text-xs">
            đã lưu
          </Typography.Text>
        ) : null}
      </span>
    );
  }

  return (
    <Descriptions
      bordered
      size="small"
      column={{ xs: 1, sm: 2, lg: 3 }}
      items={[
        {
          key: "trang_thai",
          label: "Trạng thái",
          children: (
            <span className="flex flex-wrap items-center gap-2">
              <Tag color={MAU_TRANG_THAI[phieu.trang_thai]}>
                {NHAN_TRANG_THAI[phieu.trang_thai]}
              </Tag>
              {phieu.ngay_ghi_so ? (
                <Typography.Text type="secondary" className="text-xs">
                  ghi sổ {dayjs(phieu.ngay_ghi_so).format("HH:mm DD/MM/YYYY")}
                </Typography.Text>
              ) : null}
            </span>
          ),
        },
        {
          key: "nguon",
          label: "Nguồn nhập",
          children: phieu.nguon_nhap ? (
            <Tag color={MAU_NGUON_NHAP[phieu.nguon_nhap]}>
              {NHAN_NGUON_NHAP[phieu.nguon_nhap]}
            </Tag>
          ) : (
            "—"
          ),
        },
        {
          key: "ngay",
          label: label("ngay_ct", "Ngày phiếu"),
          children: sanSang ? (
            <DatePicker
              format="DD/MM/YYYY"
              allowClear={false}
              value={dayjs(phieu.ngay_ct)}
              onChange={(v) =>
                v ? void luu("ngay_ct", { ngay_ct: v.format("YYYY-MM-DD") }) : null
              }
            />
          ) : (
            dayjs(phieu.ngay_ct).format("DD/MM/YYYY")
          ),
        },
        {
          key: "ncc",
          label: label("doi_tac_id", "Nhà cung cấp"),
          children: sanSang ? (
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full min-w-48"
              value={phieu.doi_tac_id}
              loading={ncc.isPending}
              options={(ncc.data?.dong ?? []).map((d) => ({
                value: d.id,
                label: `${d.ma} — ${d.ten}`,
              }))}
              onChange={(v) => void luu("doi_tac_id", { doi_tac_id: v })}
            />
          ) : (
            `${phieu.ma_doi_tac ?? ""} ${phieu.ten_doi_tac ?? "—"}`.trim()
          ),
        },
        {
          key: "kho",
          label: label("kho_id", "Kho mặc định"),
          children: sanSang ? (
            <Select
              className="w-full min-w-40"
              value={phieu.kho_id}
              options={(lookups.data?.kho ?? []).map((k) => ({
                value: k.id,
                label: k.ten,
              }))}
              onChange={(v) => void luu("kho_id", { kho_id: v })}
            />
          ) : (
            (phieu.ten_kho ?? "—")
          ),
        },
        {
          key: "nguoi_tao",
          label: "Người tạo",
          children: phieu.ho_ten_nguoi_tao ?? "—",
        },
        {
          key: "ghi_chu",
          label: label("ghi_chu", "Ghi chú"),
          children: sanSang ? (
            <Input
              defaultValue={phieu.ghi_chu ?? ""}
              placeholder="Ghi chú cho phiếu này"
              onBlur={(e) => void luu("ghi_chu", { ghi_chu: e.target.value || null })}
            />
          ) : (
            (phieu.ghi_chu ?? "—")
          ),
        },
      ]}
    />
  );
}
