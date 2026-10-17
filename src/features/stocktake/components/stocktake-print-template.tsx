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

import { scopeLabel } from "../lib/session-scope";
import type { CountSheetRow, StocktakeSession } from "../types";

/** Độ rộng cột của sheet "Kiểm kho" trong file mẫu in (17/10/2026). */
const COLUMN_WIDTHS = [6, 20.1, 44.3, 9, 14];

/**
 * Phiếu "Kiểm kho" (0129): Mã hàng, Tên hàng, Tồn (số trên sổ lúc in), Tồn thực tế
 * để trống cho người kiểm ghi tay. Người dùng chọn hiện số sổ trên phiếu (12/10/2026).
 * Không có quyền Xem tồn kho (0128) thì bang_dem_kiem_ke trả tồn null — bỏ hẳn cột Tồn,
 * không in 0 (người kiểm sẽ tưởng kho hết hàng).
 */
export function StocktakePrintTemplate({
  session,
  rows,
}: {
  session: StocktakeSession;
  rows: CountSheetRow[];
}) {
  const showStock = rows.some((row) => row.currentStock !== null);
  const widths = showStock ? COLUMN_WIDTHS : COLUMN_WIDTHS.filter((_, index) => index !== 3);

  return (
    <PrintSheet>
      {(printedAt) => (
        <>
          <header className="text-center">
            <div className={printCompanyText}>{COMPANY_NAME}</div>
            <div className={printAddressText}>Địa Chỉ : {COMPANY_ADDRESS}</div>
            <h1 className={`m-0 ${printTitleText}`}>KIỂM KHO</h1>
            <div className={`${printMetaText} font-bold`}>Mã phiên: {session.docNo}</div>
            <div className={printMetaText}>Ngày: {printedAt}</div>
          </header>

          <div className={printSpacer} />
          <section className="font-bold">
            <div className={printInfoLine}>Kho : {session.warehouseName}</div>
            <div className={printInfoLine}>Phạm vi : {scopeLabel(session)}</div>
          </section>
          <div className={printSpacer} />

          <table className={printTable}>
            <PrintColumns widths={widths} />
            <thead>
              <tr className={printHeadRow}>
                <th className={printCell}>STT</th>
                <th className={printCell}>Mã hàng</th>
                <th className={printCell}>Tên hàng</th>
                {showStock ? <th className={printCell}>Tồn</th> : null}
                <th className={printCell}>Tồn thực tế</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.productId} className={printBodyRow}>
                  <td className={`${printCell} text-[10pt]`}>{index + 1}</td>
                  <td className={`${printCell} ${printItemText}`}>{row.code}</td>
                  <td className={`${printCell} ${printItemText}`}>{row.name}</td>
                  {showStock ? (
                    <td className={`${printCell} ${printQtyText}`}>
                      {row.currentStock?.toLocaleString("vi-VN") ?? ""}
                    </td>
                  ) : null}
                  <td className={printCell} />
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </PrintSheet>
  );
}
