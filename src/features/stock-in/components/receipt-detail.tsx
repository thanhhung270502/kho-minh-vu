"use client";

import { Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { ReturnButton } from "@/features/returns/components/return-button";
import { PageHeader } from "@/shared/components/page-header";
import { StatusDot } from "@/shared/components/status-dot";
import { QueryState } from "@/shared/components/query-state";

import { useReceiptDetail, useReceiptLines } from "../hooks/useReceipts";
import { DOC_STATUS_LABELS, DOC_STATUS_TONES, type ReceiptPermissions } from "../types";
import { PostReceiptButton } from "./post-receipt-button";
import { ReceiptAside } from "./receipt-aside";
import { ReceiptLineTable } from "./receipt-line-table";
import { VoidReceiptDialog } from "./void-receipt-dialog";

export function ReceiptDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: ReceiptPermissions;
}) {
  const detail = useReceiptDetail(id);
  const lines = useReceiptLines(id);
  const [voidOpen, setVoidOpen] = useState(false);

  return (
    <QueryState
      query={detail}
      isEmpty={(receipt) => receipt === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>
            Không tìm thấy phiếu này, hoặc phiếu không thuộc kho bạn được phân công.
          </span>
          <Link href="/nhap-hang">
            <Button size="small">Về danh sách phiếu nhập</Button>
          </Link>
        </div>
      }
    >
      {(receipt) => {
        if (!receipt) return null;

        const receiptLines = lines.data ?? [];
        const stillEditable = receipt.status === "NHAP_LIEU";

        return (
          <>
            <Link href="/nhap-hang" className="mb-2 inline-block text-[13px] font-semibold text-chu-phu">
              ← Phiếu nhập
            </Link>

            <PageHeader
              title={receipt.docNo}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusDot tone={DOC_STATUS_TONES[receipt.status]} variant="badge">
                    {DOC_STATUS_LABELS[receipt.status]}
                  </StatusDot>
                  {receipt.partnerName ?? "Chưa chọn nhà cung cấp"}
                </span>
              }
              actions={
                <Space wrap>
                  <Link href={`/nhap-hang/${id}/in`} target="_blank">
                    <Button>In phiếu</Button>
                  </Link>

                  {/* Phiếu chưa ghi sổ: người nhập tự hủy được. Đã ghi sổ: chỉ quản lý (D-11). */}
                  {receipt.status !== "DA_HUY" &&
                  (stillEditable ? permissions.canEdit : permissions.canVoid) ? (
                    <Button danger onClick={() => setVoidOpen(true)}>
                      Hủy phiếu
                    </Button>
                  ) : null}

                  <PostReceiptButton
                    receipt={receipt}
                    lines={receiptLines}
                    canEdit={permissions.canEdit}
                  />

                  <ReturnButton document={receipt} canEdit={permissions.canEdit} />
                </Space>
              }
            />

            {/* Cùng khuôn trang đơn đặt: dòng hàng bên trái, thông tin phiếu bên phải. */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <ReceiptLineTable
                    receipt={receipt}
                    lines={loadedLines}
                    canEdit={permissions.canEdit}
                  />
                )}
              </QueryState>
              <ReceiptAside receipt={receipt} canEdit={permissions.canEdit} />
            </div>

            <VoidReceiptDialog
              receipt={receipt}
              open={voidOpen}
              onClose={() => setVoidOpen(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
