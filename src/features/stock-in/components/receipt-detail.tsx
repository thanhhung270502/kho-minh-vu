"use client";

import { Alert, Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { ReopenPostedButton } from "@/features/documents/components/reopen-posted-button";
import { RevisionNotice } from "@/features/documents/components/revision-notice";
import { ReturnButton } from "@/features/returns/components/return-button";
import { PageHeader } from "@/shared/components/page-header";
import { StatusDot } from "@/shared/components/status-dot";
import { QueryState } from "@/shared/components/query-state";

import { useReceiptDetail, useReceiptHiddenLines, useReceiptLines } from "../hooks/useReceipts";
import { DOC_STATUS_LABELS, DOC_STATUS_TONES, type ReceiptPermissions } from "../types";
import { PostReceiptButton } from "./post-receipt-button";
import { ReceiptAside } from "./receipt-aside";
import { ReceiptLineTable } from "./receipt-line-table";
import { VoidReceiptDialog } from "./void-receipt-dialog";

export function ReceiptDetailView({
  id,
  permissions: granted,
}: {
  id: string;
  permissions: ReceiptPermissions;
}) {
  const detail = useReceiptDetail(id);
  const lines = useReceiptLines(id);
  // 0136: dòng thuộc nhóm hàng không được xem đã bị ẩn — phiếu chỉ còn xem được.
  // Lỗi / đang tải coi như 0: database vẫn chặn sửa, ghi sổ, hủy.
  const hiddenLines = useReceiptHiddenLines(id).data ?? 0;
  const permissions: ReceiptPermissions =
    hiddenLines > 0
      ? { canEdit: false, canVoid: false, canReopen: false, canReturn: false }
      : granted;
  const [voidOpen, setVoidOpen] = useState(false);

  return (
    <QueryState
      query={detail}
      isEmpty={(receipt) => receipt === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>
            Không tìm thấy phiếu này, hoặc phiếu thuộc kho / nhóm hàng bạn không được giao.
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
            <Link href="/nhap-hang" className="mb-2 inline-block text-[15px] font-semibold text-chu-phu">
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

                  <ReopenPostedButton
                    document={receipt}
                    canReopen={permissions.canReopen}
                    detailHref={(draftId) => `/nhap-hang/${draftId}`}
                    forbiddenMessage="Tài khoản chưa có quyền Sửa phiếu. Liên hệ quản lý."
                  />

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

                  <ReturnButton document={receipt} canEdit={permissions.canReturn} />
                </Space>
              }
            />

            <RevisionNotice document={receipt} />

            {hiddenLines > 0 ? (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                title={`Phiếu còn ${hiddenLines} dòng thuộc nhóm hàng bạn không được xem`}
                description="Các dòng này bị ẩn và không tính vào tổng số lượng, tổng tiền. Phiếu chỉ xem được — cần sửa, ghi sổ hay hủy thì nhờ Quản lý/Admin hoặc người phụ trách nhóm đó."
              />
            ) : null}

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
