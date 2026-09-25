"use client";

import { Alert, Descriptions, Space, Tag } from "antd";
import dayjs from "dayjs";
import Link from "next/link";

import { NegativeStockPanel } from "@/features/documents/components/negative-stock-panel";
import { PostDocumentButton } from "@/features/documents/components/post-document-button";
import { VoidDocumentDialog } from "@/features/documents/components/void-document-dialog";
import { DOC_STATUS_COLORS, DOC_STATUS_LABELS } from "@/features/documents/types";
import { negativeReasonLabel } from "@/features/documents/lib/negative-reasons";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useReturnDetail, useReturnLines } from "../hooks/useReturns";
import { ReturnLineTable } from "./return-line-table";

export type ReturnPermissions = {
  /** Sửa số trả, ghi sổ — văn phòng và quản lý. */
  canEdit: boolean;
  /** Hủy phiếu trả đã ghi sổ — chỉ quản lý. */
  canVoid: boolean;
};

/**
 * `/tra-hang/{id}` — route DUY NHẤT của `features/returns` trong phase này
 * (không có màn danh sách, xem `04-14-SUMMARY.md`). Đầu phiếu chỉ đọc: phiếu
 * trả bê nguyên người nhận/kho từ chứng từ gốc, đổi đi là mất liên hệ với gốc.
 *
 * `NegativeStockPanel` chỉ hiện với `TRA_NCC` — loại trả duy nhất có thể làm
 * tồn âm (D-15). `TRA_KHACH` làm tồn TĂNG, không bao giờ cần lý do xuất âm.
 */
export function ReturnDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: ReturnPermissions;
}) {
  const detail = useReturnDetail(id);
  const lines = useReturnLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(doc) => doc === null}
      emptyDescription="Không tìm thấy phiếu trả này, hoặc phiếu không thuộc kho bạn được phân công."
    >
      {(doc) => {
        if (!doc) return null;

        const returnLines = lines.data ?? [];
        const isTraNcc = doc.docType === "TRA_NCC";
        const typeLabel = isTraNcc ? "Trả hàng NCC" : "Khách trả hàng";
        // TRA_KHACH sinh từ phiếu XUAT; TRA_NCC sinh từ phiếu NHAP (0057).
        const sourceHref = isTraNcc
          ? `/nhap-kho/${doc.sourceDocId}`
          : `/xuat-kho/${doc.sourceDocId}`;

        return (
          <>
            <PageHeader
              title={doc.docNo}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <Tag color={DOC_STATUS_COLORS[doc.status]}>
                    {DOC_STATUS_LABELS[doc.status]}
                  </Tag>
                  <Tag>{typeLabel}</Tag>
                  {doc.sourceDocId ? (
                    <Link href={sourceHref} className="text-sm">
                      Từ chứng từ {doc.sourceDocNo}
                    </Link>
                  ) : null}
                </span>
              }
              actions={
                <Space wrap>
                  <VoidDocumentDialog document={doc} canVoid={permissions.canVoid} />
                  <PostDocumentButton
                    document={doc}
                    lines={returnLines}
                    canEdit={permissions.canEdit}
                  />
                </Space>
              }
            />

            <Alert
              className="mb-4"
              type="info"
              showIcon
              title={
                isTraNcc
                  ? "Ghi sổ phiếu này làm tồn GIẢM ở kho nhận trả."
                  : "Ghi sổ phiếu này làm tồn TĂNG ở kho nhận trả."
              }
            />

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                { key: "docDate", label: "Ngày phiếu", children: dayjs(doc.docDate).format("DD/MM/YYYY") },
                {
                  key: "partner",
                  label: isTraNcc ? "Nhà cung cấp" : "Người nhận",
                  children: `${doc.partnerCode ?? ""} ${doc.partnerName ?? "—"}`.trim(),
                },
                { key: "warehouse", label: "Kho", children: doc.warehouseName ?? "—" },
                { key: "createdBy", label: "Người tạo", children: doc.createdByName ?? "—" },
                {
                  key: "postedAt",
                  label: "Ngày ghi sổ",
                  children: doc.postedAt ? dayjs(doc.postedAt).format("HH:mm DD/MM/YYYY") : "—",
                },
                { key: "note", label: "Ghi chú", children: doc.note ?? "—" },
              ]}
            />

            {isTraNcc && doc.status === "HOAN_THANH" && doc.negativeReason ? (
              <Alert
                className="mt-4"
                type="warning"
                showIcon
                title={`Phiếu này đã ghi sổ khi xuất âm — lý do: ${negativeReasonLabel(doc.negativeReason)}`}
                description={doc.negativeReasonNote ?? undefined}
              />
            ) : null}

            {isTraNcc && doc.status === "NHAP_LIEU" ? (
              <div className="mt-4">
                <NegativeStockPanel
                  documentId={doc.id}
                  lines={returnLines}
                  reason={
                    doc.negativeReason
                      ? { code: doc.negativeReason, note: doc.negativeReasonNote }
                      : null
                  }
                  editable={permissions.canEdit && doc.status === "NHAP_LIEU"}
                />
              </div>
            ) : null}

            <div className="mt-4">
              <QueryState query={lines} isEmpty={() => false} emptyDescription="">
                {(loadedLines) => (
                  <ReturnLineTable
                    documentId={doc.id}
                    lines={loadedLines}
                    editable={permissions.canEdit && doc.status === "NHAP_LIEU"}
                    decreasesStock={isTraNcc}
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
