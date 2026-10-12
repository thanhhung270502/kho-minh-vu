"use client";

import { PrintSheet, printCell } from "@/shared/components/print-sheet";
import { COMPANY_ADDRESS, COMPANY_NAME } from "@/shared/lib/print-info";

import { scopeLabel } from "../lib/session-scope";
import type { CountSheetRow, StocktakeSession } from "../types";

/**
 * Phiếu "Kiểm kho" (0129): Mã hàng, Tên hàng, Tồn (số trên sổ lúc in), Tồn thực tế
 * để trống cho người đếm ghi tay. Người dùng chọn hiện số sổ trên phiếu (12/10/2026).
 * Không có quyền Xem tồn kho (0128) thì bang_dem_kiem_ke trả tồn null — bỏ hẳn cột Tồn,
 * không in 0 (người đếm sẽ tưởng kho hết hàng).
 */
export function StocktakePrintTemplate({
  session,
  rows,
}: {
  session: StocktakeSession;
  rows: CountSheetRow[];
}) {
  const showStock = rows.some((row) => row.currentStock !== null);

  return (
    <PrintSheet>
      {(printedAt) => (
        <>
          <header className="mb-6 text-center">
            <div className="text-xl font-bold">{COMPANY_NAME}</div>
            <div className="text-sm">Địa Chỉ : {COMPANY_ADDRESS}</div>
            <h1 className="my-2 text-lg font-bold">KIỂM KHO</h1>
            <div className="text-xs font-bold">Mã phiên: {session.docNo}</div>
            <div className="text-xs italic">Ngày: {printedAt}</div>
          </header>

          <section className="mb-4 flex flex-col gap-2 text-sm font-bold">
            <div>Kho : {session.warehouseName}</div>
            <div>Phạm vi : {scopeLabel(session)}</div>
          </section>

          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr>
                <th className={`${printCell} w-10`}>STT</th>
                <th className={`${printCell} w-36`}>Mã hàng</th>
                <th className={printCell}>Tên hàng</th>
                {showStock ? <th className={`${printCell} w-20`}>Tồn</th> : null}
                <th className={`${printCell} w-28`}>Tồn thực tế</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.productId}>
                  <td className={`${printCell} text-center`}>{index + 1}</td>
                  <td className={`${printCell} text-center font-bold`}>{row.code}</td>
                  <td className={printCell}>{row.name}</td>
                  {showStock ? (
                    <td className={`${printCell} text-center`}>
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
