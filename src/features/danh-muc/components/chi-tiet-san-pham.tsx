"use client";

import { Button, Descriptions, Statistic, Tabs, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";

import { AuditLog } from "@/shared/components/audit-log";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useChiTietSanPham, useDanhMucPhu, useTonTheoKho } from "../hooks/useSanPham";
import type { DanhMucPhu } from "../types";
import { soVn } from "./cot-san-pham";
import { NganKeoSanPham } from "./ngan-keo-san-pham";
import { TheKho } from "./the-kho";

export type QuyenChiTiet = {
  sua: boolean;
  xemGiaVon: boolean;
  suaGiaBan: boolean;
  xemLichSu: boolean;
};

const NHAN_TRUONG: Record<string, string> = {
  ma_hang: "Mã hàng",
  ten_hang: "Tên hàng",
  nhom_hang_id: "Nhóm hàng",
  dvt_id: "Đơn vị tính",
  cong_doan_id: "Công đoạn",
  quy_doi: "Quy đổi",
  kho_mac_dinh_id: "Kho mặc định",
  ton_toi_thieu: "Tồn tối thiểu",
  ton_toi_da: "Tồn tối đa",
  gia_ban: "Giá bán",
  dang_kinh_doanh: "Đang kinh doanh",
  barcode: "Barcode",
  ghi_chu: "Ghi chú",
  can_ra_dvt: "Cờ ĐVT mâu thuẫn",
  da_xac_nhan_ra: "Đã xác nhận rà",
};

/** Nhật ký lưu uuid — đổi sang tên để người đọc hiểu được. */
function taoHienGiaTri(dm: DanhMucPhu | undefined) {
  return (truong: string, v: unknown) => {
    if (typeof v !== "string" || !dm) return undefined;

    const table =
      truong === "nhom_hang_id"
        ? dm.nhomHang
        : truong === "dvt_id"
          ? dm.donViTinh
          : truong === "cong_doan_id"
            ? dm.congDoan
            : truong === "kho_mac_dinh_id"
              ? dm.kho
              : null;

    return table?.find((m) => m.id === v)?.ten;
  };
}

export function ChiTietSanPham({ id, quyen }: { id: string; quyen: QuyenChiTiet }) {
  const chiTiet = useChiTietSanPham(id);
  const tonTheoKho = useTonTheoKho(id);
  const danhMucPhu = useDanhMucPhu();
  const [suaMo, setSuaMo] = useState(false);

  return (
    <QueryState
      query={chiTiet}
      isEmpty={(d) => d === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy mã hàng này — có thể đã bị đổi mã.</span>
          <Link href="/danh-muc">
            <Button size="small">Về danh mục</Button>
          </Link>
        </div>
      }
    >
      {(d) => {
        if (!d) return null;

        return (
          <>
            <Link href="/danh-muc" className="mb-2 inline-block text-sm">
              ← Danh mục
            </Link>

            <PageHeader
              title={d.ma_hang}
              description={d.ten_hang}
              actions={
                quyen.sua ? (
                  <Button type="primary" onClick={() => setSuaMo(true)}>
                    Sửa
                  </Button>
                ) : null
              }
            />

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                { key: "nhom", label: "Nhóm hàng", children: d.ten_nhom_hang ?? "—" },
                { key: "dvt", label: "Đơn vị tính", children: d.ten_dvt },
                {
                  key: "cd",
                  label: "Công đoạn",
                  children: <Tag color={d.mau_cong_doan || undefined}>{d.ten_cong_doan}</Tag>,
                },
                { key: "qd", label: "Quy đổi", children: soVn(d.quy_doi) },
                { key: "kho", label: "Kho mặc định", children: d.ten_kho_mac_dinh ?? "—" },
                {
                  key: "dm",
                  label: "Tồn tối thiểu / tối đa",
                  children: `${soVn(d.ton_toi_thieu)} / ${d.ton_toi_da === null ? "không giới hạn" : soVn(d.ton_toi_da)}`,
                },
                { key: "gb", label: "Giá bán", children: soVn(d.gia_ban) },
                ...(quyen.xemGiaVon
                  ? [{ key: "gv", label: "Giá vốn", children: soVn(d.gia_von) }]
                  : []),
                { key: "bc", label: "Barcode", children: d.barcode ?? "—" },
                {
                  key: "tt",
                  label: "Trạng thái",
                  children: (
                    <span className="flex flex-wrap gap-1">
                      {d.dang_kinh_doanh ? (
                        <Tag color="green">Đang kinh doanh</Tag>
                      ) : (
                        <Tag>Ngừng kinh doanh</Tag>
                      )}
                      {d.can_ra ? <Tag color="orange">Cần rà</Tag> : null}
                    </span>
                  ),
                },
                { key: "gc", label: "Ghi chú", children: d.ghi_chu ?? "—" },
              ]}
            />

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">Tồn theo kho</h3>
              <QueryState
                query={tonTheoKho}
                emptyDescription="Chưa có tồn — chưa có chứng từ nào cho mã này."
              >
                {(ton) => (
                  <div className="flex flex-wrap gap-6">
                    {ton.map((t) => (
                      <Statistic
                        key={t.kho_id}
                        title={t.ten_kho}
                        value={t.so_luong}
                        suffix={d.ten_dvt}
                      />
                    ))}
                  </div>
                )}
              </QueryState>
            </div>

            <Tabs
              className="mt-4"
              items={[
                {
                  key: "the-kho",
                  label: "Thẻ kho",
                  children: <TheKho sanPhamId={id} xemGiaVon={quyen.xemGiaVon} />,
                },
                ...(quyen.xemLichSu
                  ? [
                      {
                        key: "lich-su",
                        label: "Lịch sử sửa",
                        children: (
                          <AuditLog
                            table="san_pham"
                            id={id}
                            fieldLabels={NHAN_TRUONG}
                            renderValue={taoHienGiaTri(danhMucPhu.data)}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <NganKeoSanPham
              id={id}
              open={suaMo}
              quyen={quyen}
              onClose={() => setSuaMo(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
