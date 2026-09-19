"use client";

import { Button, Space } from "antd";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useReceiptDetail, useReceiptLines } from "../hooks/useReceipts";
import type { ReceiptPermissions } from "../types";
import { PostReceiptButton } from "./post-receipt-button";
import { ReceiptHeader } from "./receipt-header";
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
          <Link href="/nhap-kho">
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
            <Link href="/nhap-kho" className="mb-2 inline-block text-sm">
              ← Phiếu nhập
            </Link>

            <PageHeader
              title={receipt.docNo}
              description={receipt.partnerName ?? "Chưa chọn nhà cung cấp"}
              actions={
                <Space wrap>
                  <Link href={`/nhap-kho/${id}/in`} target="_blank">
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
                </Space>
              }
            />

            <ReceiptHeader receipt={receipt} canEdit={permissions.canEdit} />

            <div className="mt-4">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <ReceiptLineTable
                    receipt={receipt}
                    lines={loadedLines}
                    canEdit={permissions.canEdit}
                  />
                )}
              </QueryState>
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
