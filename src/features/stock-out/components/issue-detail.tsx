"use client";

import { Alert, Button, Space, Tag } from "antd";
import Link from "next/link";

import { NegativeStockPanel } from "@/features/documents/components/negative-stock-panel";
import { PostDocumentButton } from "@/features/documents/components/post-document-button";
import { VoidDocumentDialog } from "@/features/documents/components/void-document-dialog";
import { negativeReasonLabel } from "@/features/documents/lib/negative-reasons";
import { ReturnButton } from "@/features/returns/components/return-button";
import { orderKeys } from "@/features/sales-order/api/order.keys";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useIssueDetail, useIssueLines } from "../hooks/useIssues";
import { DOC_STATUS_COLORS, DOC_STATUS_LABELS } from "../types";
import type { IssuePermissions } from "../types";
import { IssueHeader } from "./issue-header";
import { IssueLineTable } from "./issue-line-table";
import { SimilarCodeHint } from "./similar-code-hint";

const ORDER_KEYS = [orderKeys.all];

export function IssueDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: IssuePermissions;
}) {
  const detail = useIssueDetail(id);
  const lines = useIssueLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(issue) => issue === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>
            Không tìm thấy phiếu này, hoặc phiếu không thuộc kho bạn được phân
            công.
          </span>
          <Link href="/xuat-kho">
            <Button size="small">Về danh sách phiếu xuất</Button>
          </Link>
        </div>
      }
    >
      {(issue) => {
        if (!issue) return null;

        // D-04/D-06: phiếu còn nhập liệu mới sửa được ở giao diện; đã ghi sổ
        // thì khóa. Chặn thật ở policy "chi sua chung tu dang nhap lieu" (0016).
        const editable = permissions.canEdit && issue.status === "NHAP_LIEU";
        const issueLines = lines.data ?? [];

        return (
          <>
            <Link href="/xuat-kho" className="mb-2 inline-block text-sm">
              ← Phiếu xuất
            </Link>

            <PageHeader
              title={issue.docNo}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <Tag color={DOC_STATUS_COLORS[issue.status]}>
                    {DOC_STATUS_LABELS[issue.status]}
                  </Tag>
                  {issue.partnerName ?? "Chưa chọn người nhận"}
                  {issue.orderId ? (
                    <Link href={`/dat-hang/${issue.orderId}`} className="text-sm">
                      Từ đơn {issue.orderNo}
                    </Link>
                  ) : null}
                </span>
              }
              actions={
                <Space wrap>
                  <Link href={`/xuat-kho/${id}/in`} target="_blank">
                    <Button>In phiếu giao hàng</Button>
                  </Link>
                  <ReturnButton document={issue} canEdit={permissions.canEdit} />
                  <VoidDocumentDialog document={issue} canVoid={permissions.canVoid} />
                  <PostDocumentButton
                    document={issue}
                    lines={issueLines}
                    canEdit={permissions.canEdit}
                    extraInvalidateKeys={ORDER_KEYS}
                  />
                </Space>
              }
            />

            {issue.status === "HOAN_THANH" && issue.negativeReason ? (
              <Alert
                className="mb-4"
                type="warning"
                showIcon
                title={`Phiếu này đã ghi sổ khi xuất âm — lý do: ${negativeReasonLabel(issue.negativeReason)}`}
                description={issue.negativeReasonNote ?? undefined}
              />
            ) : null}

            <IssueHeader issue={issue} canEdit={permissions.canEdit} />

            <NegativeStockPanel
              documentId={issue.id}
              lines={issueLines}
              reason={
                issue.negativeReason
                  ? { code: issue.negativeReason, note: issue.negativeReasonNote }
                  : null
              }
              editable={editable}
              renderLineExtra={(line) => <SimilarCodeHint issueId={issue.id} line={line} />}
            />

            <div className="mt-4">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <IssueLineTable
                    issue={issue}
                    lines={loadedLines}
                    editable={editable}
                  />
                )}
              </QueryState>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
