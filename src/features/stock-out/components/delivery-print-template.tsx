"use client";

import { PrintField, PrintSheet, printCell } from "@/shared/components/print-sheet";
import { COMPANY_BRANCH, INTERNAL_ONLY_NOTICE, exportKindOf } from "@/shared/lib/print-info";

import type { IssueDetail, IssueLine } from "../types";

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
          <header className="mb-6 text-center">
            <h1 className="m-0 text-lg font-bold">{kind.title}</h1>
            <div className="text-sm">
              {kind.codeLabel} : {issue.docNo}
            </div>
            <div className="text-sm">{printedAt}</div>
            {isDraft ? <div className="mt-1 text-xs font-bold text-gray-500">BẢN NHÁP — CHƯA GHI SỔ</div> : null}
          </header>

          <section className="mb-4 flex flex-col gap-3 text-sm">
            <PrintField label="Chi Nhánh" value={COMPANY_BRANCH} />
            <PrintField label="Nhân Viên Đặt" value={issue.createdByName} />
            <PrintField label="NV Nhận - Kiểm Hàng" />
            <PrintField label="Loại Xuất" value={kind.label} />
            <PrintField label="Thông Tin Phiếu" value={issue.note} />
          </section>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${printCell} w-12`}>STT</th>
                <th className={`${printCell} w-44`}>Mã Hàng</th>
                <th className={printCell}>Tên Hàng</th>
                <th className={`${printCell} w-20`}>SL Xuất</th>
                <th className={`${printCell} w-20`}>Khu Vực</th>
                <th className={`${printCell} w-28`}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td className={`${printCell} text-center`}>{index + 1}</td>
                  <td className={`${printCell} text-center font-bold`}>{line.productCode}</td>
                  <td className={`${printCell} text-center`}>{line.productName}</td>
                  <td className={`${printCell} text-center font-bold`}>
                    {Number(line.quantity).toLocaleString("vi-VN")}
                  </td>
                  <td className={`${printCell} text-center text-base`}>{line.warehouseName ?? ""}</td>
                  <td className={`${printCell} text-center`}>{line.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-center text-sm font-bold italic">{INTERNAL_ONLY_NOTICE}</p>
        </>
      )}
    </PrintSheet>
  );
}
