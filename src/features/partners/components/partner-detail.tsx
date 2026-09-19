"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, Descriptions, Tabs, Tag, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuditLog } from "@/shared/components/audit-log";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { usePartnerDetail } from "../hooks/usePartners";
import { PARTNER_KIND_COLORS, PARTNER_KIND_LABELS } from "../types";
import { PartnerDrawer } from "./partner-drawer";
import { TransactionHistory } from "./transaction-history";

/** Khóa là TÊN CỘT trong `nhat_ky_sua.truong` — không đổi sang tiếng Anh. */
const FIELD_LABELS: Record<string, string> = {
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

export type PartnerDetailPermissions = {
  canEdit: boolean;
  canViewHistory: boolean;
};

/**
 * Tên trong ô Ghi chú KiotViet đã gán cho đối tác này. Bảng ánh xạ chỉ mở cho
 * quản lý/văn phòng — vai trò khác nhận 42501, khi đó ẩn hẳn khối này thay vì
 * hiện lỗi (thiếu thông tin phụ không phải là hỏng màn hình).
 */
function useMappedNoteNames(partnerId: string) {
  return useQuery({
    queryKey: ["partners", "note-mapping", partnerId],
    queryFn: async () => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("anh_xa_ghi_chu_kiotviet")
        .select("gia_tri, loai")
        .eq("doi_tac_id", partnerId);

      if (error) {
        if (error.code === "42501") return [];
        throw error;
      }
      return (data ?? []).map((row) => ({ value: row.gia_tri, kind: row.loai }));
    },
    retry: false,
  });
}

export function PartnerDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: PartnerDetailPermissions;
}) {
  const detail = usePartnerDetail(id);
  const noteNames = useMappedNoteNames(id);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <QueryState
      query={detail}
      isEmpty={(partner) => partner === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy đối tác này.</span>
          <Link href="/doi-tac">
            <Button size="small">Về danh sách đối tác</Button>
          </Link>
        </div>
      }
    >
      {(partner) => {
        if (!partner) return null;

        return (
          <>
            <Link href="/doi-tac" className="mb-2 inline-block text-sm">
              ← Đối tác
            </Link>

            <PageHeader
              title={partner.name}
              description={
                <span className="flex items-center gap-2">
                  <Tag color={PARTNER_KIND_COLORS[partner.kind]}>
                    {PARTNER_KIND_LABELS[partner.kind]}
                  </Tag>
                  <span className="font-mono">{partner.code}</span>
                  {partner.isActive ? null : <Tag>Ngừng hoạt động</Tag>}
                </span>
              }
              actions={
                permissions.canEdit ? (
                  <Button type="primary" onClick={() => setEditOpen(true)}>
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
                  key: "phone",
                  label: "Điện thoại",
                  children: partner.phone ? (
                    <a href={`tel:${partner.phone}`}>{partner.phone}</a>
                  ) : (
                    "—"
                  ),
                },
                { key: "email", label: "Email", children: partner.email ?? "—" },
                { key: "region", label: "Khu vực", children: partner.region ?? "—" },
                { key: "address", label: "Địa chỉ", children: partner.address ?? "—" },
                { key: "taxCode", label: "Mã số thuế", children: partner.taxCode ?? "—" },
                // KHÔNG đặt `span` cố định: lưới đổi theo breakpoint (1/2/3 cột)
                // nên span 3 làm vỡ tổng span ở màn 2 cột, antd cảnh báo.
                { key: "note", label: "Ghi chú", children: partner.note ?? "—" },
              ]}
            />

            {(noteNames.data ?? []).length > 0 ? (
              <Typography.Paragraph type="secondary" className="mt-3 mb-0">
                Tên trong ô Ghi chú KiotViet:{" "}
                {(noteNames.data ?? []).map((note) => (
                  <Tag key={note.value} className="m-0 me-1">
                    {note.value.replace(/\s+/g, " ").trim()}
                  </Tag>
                ))}
              </Typography.Paragraph>
            ) : null}

            <Tabs
              className="mt-4"
              items={[
                {
                  key: "transactions",
                  label: "Giao dịch",
                  children: <TransactionHistory partnerId={id} />,
                },
                ...(permissions.canViewHistory
                  ? [
                      {
                        key: "audit-log",
                        label: "Lịch sử sửa",
                        children: (
                          <AuditLog table="doi_tac" id={id} fieldLabels={FIELD_LABELS} />
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <PartnerDrawer
              id={id}
              open={editOpen}
              onClose={() => setEditOpen(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
