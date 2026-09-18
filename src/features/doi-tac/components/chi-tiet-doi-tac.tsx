"use client";

import { Button, Descriptions, Tabs, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LichSuSua } from "@/shared/components/lich-su-sua";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useChiTietDoiTac } from "../hooks/useDoiTac";
import { MAU_LOAI_DOI_TAC, NHAN_LOAI_DOI_TAC } from "../types";
import { LichSuGiaoDich } from "./lich-su-giao-dich";
import { NganKeoDoiTac } from "./ngan-keo-doi-tac";

const NHAN_TRUONG: Record<string, string> = {
  ma: "Mã",
  ten: "Tên",
  loai: "Loại",
  dien_thoai: "Điện thoại",
  email: "Email",
  dia_chi: "Địa chỉ",
  khu_vuc: "Khu vực",
  ma_so_thue: "Mã số thuế",
  ghi_chu: "Ghi chú",
  dang_hoat_dong: "Đang hoạt động",
};

/**
 * Tên trong ô Ghi chú KiotViet đã gán cho đối tác này. Bảng ánh xạ chỉ mở cho
 * quản lý/văn phòng — vai trò khác nhận 42501, khi đó ẩn hẳn khối này thay vì
 * hiện lỗi (thiếu thông tin phụ không phải là hỏng màn hình).
 */
function useTenGhiChu(doiTacId: string) {
  return useQuery({
    queryKey: ["doi-tac", "anh-xa-ghi-chu", doiTacId],
    queryFn: async () => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("anh_xa_ghi_chu_kiotviet")
        .select("gia_tri, loai")
        .eq("doi_tac_id", doiTacId);

      if (error) {
        if (error.code === "42501") return [];
        throw error;
      }
      return data ?? [];
    },
    retry: false,
  });
}

export function ChiTietDoiTac({
  id,
  quyen,
}: {
  id: string;
  quyen: { sua: boolean; xemLichSu: boolean };
}) {
  const chiTiet = useChiTietDoiTac(id);
  const tenGhiChu = useTenGhiChu(id);
  const [suaMo, setSuaMo] = useState(false);

  return (
    <QueryState
      query={chiTiet}
      laRong={(d) => d === null}
      moTaRong={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy đối tác này.</span>
          <Link href="/doi-tac">
            <Button size="small">Về danh sách đối tác</Button>
          </Link>
        </div>
      }
    >
      {(d) => {
        if (!d) return null;

        return (
          <>
            <Link href="/doi-tac" className="mb-2 inline-block text-sm">
              ← Đối tác
            </Link>

            <PageHeader
              tieuDe={d.ten}
              moTa={
                <span className="flex items-center gap-2">
                  <Tag color={MAU_LOAI_DOI_TAC[d.loai]}>{NHAN_LOAI_DOI_TAC[d.loai]}</Tag>
                  <span className="font-mono">{d.ma}</span>
                  {d.dang_hoat_dong ? null : <Tag>Ngừng hoạt động</Tag>}
                </span>
              }
              hanhDong={
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
                {
                  key: "dt",
                  label: "Điện thoại",
                  children: d.dien_thoai ? (
                    <a href={`tel:${d.dien_thoai}`}>{d.dien_thoai}</a>
                  ) : (
                    "—"
                  ),
                },
                { key: "em", label: "Email", children: d.email ?? "—" },
                { key: "kv", label: "Khu vực", children: d.khu_vuc ?? "—" },
                { key: "dc", label: "Địa chỉ", children: d.dia_chi ?? "—" },
                { key: "mst", label: "Mã số thuế", children: d.ma_so_thue ?? "—" },
                // KHÔNG đặt `span` cố định: lưới đổi theo breakpoint (1/2/3 cột)
                // nên span 3 làm vỡ tổng span ở màn 2 cột, antd cảnh báo.
                { key: "gc", label: "Ghi chú", children: d.ghi_chu ?? "—" },
              ]}
            />

            {(tenGhiChu.data ?? []).length > 0 ? (
              <Typography.Paragraph type="secondary" className="mt-3 mb-0">
                Tên trong ô Ghi chú KiotViet:{" "}
                {(tenGhiChu.data ?? []).map((g) => (
                  <Tag key={g.gia_tri} className="m-0 me-1">
                    {g.gia_tri.replace(/\s+/g, " ").trim()}
                  </Tag>
                ))}
              </Typography.Paragraph>
            ) : null}

            <Tabs
              className="mt-4"
              items={[
                {
                  key: "giao-dich",
                  label: "Giao dịch",
                  children: <LichSuGiaoDich doiTacId={id} />,
                },
                ...(quyen.xemLichSu
                  ? [
                      {
                        key: "lich-su",
                        label: "Lịch sử sửa",
                        children: (
                          <LichSuSua bang="doi_tac" id={id} nhanTruong={NHAN_TRUONG} />
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <NganKeoDoiTac id={id} open={suaMo} onDong={() => setSuaMo(false)} />
          </>
        );
      }}
    </QueryState>
  );
}
