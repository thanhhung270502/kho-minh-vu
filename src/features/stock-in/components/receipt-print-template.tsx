"use client";

import {
  PrintColumns,
  PrintSheet,
  printAddressText,
  printBodyRow,
  printCell,
  printCompanyText,
  printHeadRow,
  printInfoLine,
  printItemText,
  printMetaText,
  printQtyText,
  printSpacer,
  printTable,
  printTitleText,
} from "@/shared/components/print-sheet";
import { COMPANY_ADDRESS, COMPANY_NAME } from "@/shared/lib/print-info";

import type { DocumentDetail, DocumentLine } from "../types";

/** Độ rộng cột của sheet "Phiếu nhập" trong file mẫu in (17/10/2026). */
const COLUMN_WIDTHS = [6, 20.1, 44.3, 10, 8];

/**
 * Phiếu nhập hàng, theo "Phiếu Mẫu - Nhập hàng" (08/10/2026). KHÔNG có đơn giá và
 * thành tiền — giấy nhận hàng ở kho, giá xem trên màn hình. Ghi chú cột = ghi chú
 * dòng. Không in dòng "Ghi Chú" cuối phiếu (ghi chú "Người nhập: …") — người dùng bỏ 17/10/2026.
 */
export function ReceiptPrintTemplate({
  receipt,
  lines,
}: {
  receipt: DocumentDetail;
  lines: DocumentLine[];
}) {
  return (
    <PrintSheet>
      {(printedAt) => (
        <>
          <header className="text-center">
            <div className={printCompanyText}>{COMPANY_NAME}</div>
            <div className={printAddressText}>Địa Chỉ : {COMPANY_ADDRESS}</div>
            <h1 className={`m-0 ${printTitleText}`}>PHIẾU NHẬP HÀNG</h1>
            <div className={`${printMetaText} font-bold`}>Mã phiếu: {receipt.docNo}</div>
            <div className={printMetaText}>Ngày: {printedAt}</div>
          </header>

          <div className={printSpacer} />
          <section className="font-bold">
            <div className={printInfoLine}>Người Lập Phiếu : {receipt.createdByName ?? ""}</div>
            <div className={printInfoLine}>Nhà Cung Cấp : {receipt.partnerName ?? ""}</div>
          </section>
          <div className={printSpacer} />

          <table className={printTable}>
            <PrintColumns widths={COLUMN_WIDTHS} />
            <thead>
              <tr className={printHeadRow}>
                <th className={printCell}>STT</th>
                <th className={printCell}>Mã hàng</th>
                <th className={printCell}>Tên hàng</th>
                <th className={printCell}>Số lượng</th>
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
                  <td className={printCell}>{line.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </PrintSheet>
  );
}
