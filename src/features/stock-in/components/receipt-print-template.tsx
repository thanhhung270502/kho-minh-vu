"use client";

import { PrintSheet, printCell } from "@/shared/components/print-sheet";
import { COMPANY_ADDRESS, COMPANY_NAME } from "@/shared/lib/print-info";

import type { DocumentDetail, DocumentLine } from "../types";

/**
 * Phiếu nhập hàng, theo "Phiếu Mẫu - Nhập hàng" (08/10/2026). KHÔNG có đơn giá và
 * thành tiền — giấy nhận hàng ở kho, giá xem trên màn hình. Ghi chú cột = ghi chú
 * dòng; Ghi chú cuối phiếu = ghi chú phiếu.
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
          <header className="mb-6 text-center">
            <div className="text-xl font-bold">{COMPANY_NAME}</div>
            <div className="text-sm">Địa Chỉ : {COMPANY_ADDRESS}</div>
            <h1 className="my-2 text-lg font-bold">PHIẾU NHẬP HÀNG</h1>
            <div className="text-xs font-bold">Mã phiếu: {receipt.docNo}</div>
            <div className="text-xs italic">Ngày: {printedAt}</div>
          </header>

          <section className="mb-4 flex flex-col gap-5 text-sm font-bold">
            <div>Người Lập Phiếu : {receipt.createdByName ?? ""}</div>
            <div>Nhà Cung Cấp : {receipt.partnerName ?? ""}</div>
          </section>

          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr>
                <th className={`${printCell} w-10`}>STT</th>
                <th className={`${printCell} w-36`}>Mã hàng</th>
                <th className={printCell}>Tên hàng</th>
                <th className={`${printCell} w-20`}>Số lượng</th>
                <th className={`${printCell} w-16`}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td className={`${printCell} text-center`}>{index + 1}</td>
                  <td className={`${printCell} text-center font-bold`}>{line.productCode}</td>
                  <td className={`${printCell} text-center`}>{line.productName}</td>
                  <td className={`${printCell} text-center`}>
                    {Number(line.quantity).toLocaleString("vi-VN")}
                  </td>
                  <td className={`${printCell} text-center`}>{line.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 text-sm font-bold">Ghi Chú : {receipt.note ?? ""}</div>
        </>
      )}
    </PrintSheet>
  );
}
