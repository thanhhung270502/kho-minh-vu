"use client";

import { Button, Descriptions, Skeleton, Tabs, Tag, Typography } from "antd";
import { useState } from "react";

import { AuditLog } from "@/shared/components/audit-log";
import { DetailPanel } from "@/shared/components/detail-panel";
import { explainError } from "@/shared/lib/errors";

import { usePartnerDetail } from "../hooks/usePartners";
import { PARTNER_KIND_COLORS, PARTNER_KIND_LABELS, type PartnerDetail } from "../types";
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

export type PartnerPanelPermissions = { canEdit: boolean; canViewHistory: boolean };

function PartnerInfo({ partner }: { partner: PartnerDetail }) {
  return (
    <Descriptions
      size="small"
      column={1}
      items={[
        {
          key: "kind",
          label: "Loại",
          children: (
            <span>
              <Tag color={PARTNER_KIND_COLORS[partner.kind]}>{PARTNER_KIND_LABELS[partner.kind]}</Tag>
              {partner.isActive ? null : <Tag>Ngừng hoạt động</Tag>}
            </span>
          ),
        },
        { key: "code", label: "Mã", children: <span className="font-mono">{partner.code}</span> },
        { key: "name", label: "Tên", children: partner.name },
        {
          key: "phone",
          label: "Điện thoại",
          children: partner.phone ? <a href={`tel:${partner.phone}`}>{partner.phone}</a> : "—",
        },
        { key: "address", label: "Địa chỉ", children: partner.address ?? "—" },
        { key: "note", label: "Ghi chú", children: partner.note ?? "—" },
      ]}
    />
  );
}

/** Panel bấm dòng ở /doi-tac — thay trang /doi-tac/<id> cũ (PANEL-02/03). */
export function PartnerPanel({
  partnerId,
  permissions,
  onClose,
}: {
  partnerId: string;
  permissions: PartnerPanelPermissions;
  onClose: () => void;
}) {
  const detail = usePartnerDetail(partnerId);
  const [editOpen, setEditOpen] = useState(false);
  const partner = detail.data;

  return (
    <DetailPanel
      title={partner?.name ?? "Đối tác"}
      onClose={onClose}
      extra={
        permissions.canEdit && partner ? (
          <Button size="small" onClick={() => setEditOpen(true)}>
            Sửa
          </Button>
        ) : null
      }
    >
      {detail.isPending ? (
        <Skeleton active />
      ) : detail.isError ? (
        <Typography.Text type="danger">
          {explainError(detail.error).title}.{" "}
          <Typography.Link onClick={() => void detail.refetch()}>Thử lại</Typography.Link>
        </Typography.Text>
      ) : !partner ? (
        <Typography.Text type="secondary">Không tìm thấy đối tác này.</Typography.Text>
      ) : (
        <Tabs
          size="small"
          items={[
            { key: "info", label: "Thông tin", children: <PartnerInfo partner={partner} /> },
            {
              key: "transactions",
              label: "Lịch sử giao dịch",
              children: <TransactionHistory partnerId={partnerId} />,
            },
            ...(permissions.canViewHistory
              ? [
                  {
                    key: "audit-log",
                    label: "Lịch sử sửa",
                    children: <AuditLog table="doi_tac" id={partnerId} fieldLabels={FIELD_LABELS} />,
                  },
                ]
              : []),
          ]}
        />
      )}

      <PartnerDrawer id={partnerId} open={editOpen} onClose={() => setEditOpen(false)} />
    </DetailPanel>
  );
}
