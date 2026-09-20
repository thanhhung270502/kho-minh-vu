"use client";

import { Alert, Button, Space, Tag } from "antd";
import Link from "next/link";

import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useIssueDetail, useIssueLines } from "../hooks/useIssues";
import { negativeReasonLabel } from "../lib/negative-reasons";
import { DOC_STATUS_COLORS, DOC_STATUS_LABELS } from "../types";
import type { IssuePermissions } from "../types";
import { IssueHeader } from "./issue-header";
import { IssueLineTable } from "./issue-line-table";
import { NegativeStockPanel } from "./negative-stock-panel";
import { PostIssueButton } from "./post-issue-button";
import { VoidIssueDialog } from "./void-issue-dialog";

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

        // Nguồn gốc của phiếu này: hoặc sinh từ đơn (XUAT thường), hoặc là
        // phiếu trả có chứng từ gốc (TRA_KHACH/TRA_NCC — dùng chung component
        // này cho màn phiếu trả của plan 04-14 nếu route đó thuận tiện; nếu
        // không thì 04-14 tự dựng view riêng, phần dưới đây vẫn đúng vì tự
        // suy route theo docType, không hard-code "/xuat-kho").
        const sourceHref =
          issue.docType === "TRA_NCC"
            ? `/nhap-kho/${issue.sourceDocId}`
            : `/xuat-kho/${issue.sourceDocId}`;

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
                  {issue.sourceDocId ? (
                    <Link href={sourceHref} className="text-sm">
                      Từ chứng từ {issue.sourceDocNo}
                    </Link>
                  ) : null}
                </span>
              }
              actions={
                // Nút in phiếu giao hàng và nút "Khách trả hàng" cắm vào đây ở
                // plan 04-14.
                <Space wrap>
                  <VoidIssueDialog issue={issue} canVoid={permissions.canVoid} />
                  <PostIssueButton issue={issue} lines={issueLines} canEdit={permissions.canEdit} />
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
              issueId={issue.id}
              lines={issueLines}
              reason={
                issue.negativeReason
                  ? { code: issue.negativeReason, note: issue.negativeReasonNote }
                  : null
              }
              editable={editable}
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
