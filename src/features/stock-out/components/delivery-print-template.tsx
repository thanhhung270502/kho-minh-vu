"use client";

import {
  PrintColumns,
  PrintField,
  PrintSheet,
  printBodyRow,
  printCell,
  printHeadRow,
  printItemText,
  printQtyText,
  printSpacer,
  printTable,
} from "@/shared/components/print-sheet";
import { COMPANY_BRANCH, INTERNAL_ONLY_NOTICE, exportKindOf } from "@/shared/lib/print-info";

import type { IssueDetail, IssueLine } from "../types";

/** Độ rộng cột của sheet "Duyệt đơn" trong file mẫu in (17/10/2026). */
const COLUMN_WIDTHS = [7, 20.1, 44.3, 9, 10, 14];

/**
 * Phiếu in của Duyệt đơn, theo "Phiếu mẫu - Duyệt đơn" (08/10/2026). Đầu phiếu và
 * Loại xuất theo người nhận (mã NB… = Lệnh điều chuyển - xuất dùng nội bộ). Thông
 * tin phiếu = ghi chú phiếu; Khu vực = kho của dòng; Ghi chú = ghi chú dòng.
 * KHÔNG in giá — giá vốn không được ra giấy.
 */
export function DeliveryPrintTemplate({
  issue,
  lines,
}: {
  issue: IssueDetail;
  lines: IssueLine[];
}) {
  const kind = exportKindOf(issue.partnerCode);
  const isDraft = issue.status !== "HOAN_THANH";

  return (
    <PrintSheet>
      {(printedAt) => (
        <>
          <div className={printSpacer} />
          <header className="text-center">
            <h1 className="m-0 text-[13pt] leading-[21.9pt] font-bold">{kind.title}</h1>
            <div className="text-[11pt] leading-[18pt]">
              {kind.codeLabel} : {issue.docNo}
            </div>
            <div className="text-[11pt] leading-[18pt]">{printedAt}</div>
            {isDraft ? <div className="text-[9pt] font-bold text-gray-500">BẢN NHÁP — CHƯA HOÀN THÀNH</div> : null}
          </header>

          <div className={printSpacer} />
          <section>
            <PrintField label="Chi Nhánh" value={COMPANY_BRANCH} />
            <PrintField label="Nhân Viên Đặt" value={issue.createdByName} />
            <PrintField label="NV Nhận - Kiểm Hàng" />
            <PrintField label="Loại Xuất" value={kind.label} />
            <PrintField label="Thông Tin Phiếu" value={issue.note} />
          </section>
          <div className={printSpacer} />

          <table className={printTable}>
            <PrintColumns widths={COLUMN_WIDTHS} />
            <thead>
              <tr className={printHeadRow}>
                <th className={printCell}>STT</th>
                <th className={printCell}>Mã Hàng</th>
                <th className={printCell}>Tên Hàng</th>
                <th className={printCell}>SL Xuất</th>
                <th className={printCell}>Khu Vực</th>
                <th className={printCell}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className={printBodyRow}>
                  <td className={printCell}>{index + 1}</td>
                  <td className={`${printCell} ${printItemText}`}>{line.productCode}</td>
                  <td className={`${printCell} ${printItemText}`}>{line.productName}</td>
                  <td className={`${printCell} ${printQtyText}`}>
                    {Number(line.quantity).toLocaleString("vi-VN")}
                  </td>
                  <td className={printCell}>{line.warehouseName ?? ""}</td>
                  <td className={printCell}>{line.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={printSpacer} />
          <p className="m-0 flex h-[33.9pt] items-center justify-center text-center text-[11pt] font-bold">
            {INTERNAL_ONLY_NOTICE}
          </p>
        </>
      )}
    </PrintSheet>
  );
}
