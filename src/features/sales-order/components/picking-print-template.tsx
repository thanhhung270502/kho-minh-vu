"use client";

import { PrintField, PrintSheet, printCell } from "@/shared/components/print-sheet";
import {
  COMPANY_ADDRESS,
  COMPANY_NAME,
  INTERNAL_ONLY_NOTICE,
  exportKindOf,
} from "@/shared/lib/print-info";

import type { OrderDetail, OrderLine } from "../types";

/**
 * Phiếu xuất kho in từ đơn đặt, theo "Phiếu Mẫu - Đơn đặt" (08/10/2026): dưới mã
 * hàng ghi nhóm hàng, Khu vực = kho mặc định của mã, Ghi chú = ghi chú dòng,
 * Thông tin phiếu = ghi chú đơn (tên người nhận gõ tay). Không giá. Dòng giữ thứ tự nhập.
 */
export function PickingPrintTemplate({
  order,
  lines,
}: {
  order: OrderDetail;
  lines: OrderLine[];
}) {
  const kind = exportKindOf(order.recipients.partner?.code);

  return (
    <PrintSheet>
      {(printedAt) => (
        <>
          <header className="mb-6 text-center">
            <div className="text-lg font-bold">{COMPANY_NAME}</div>
            <div className="text-sm">Địa chỉ: {COMPANY_ADDRESS}</div>
            <div className="mt-6 text-sm font-bold">Phiếu Xuất Kho</div>
            <div className="text-sm">Mã đơn hàng: {order.orderNo}</div>
            <div className="text-sm">{printedAt}</div>
          </header>

          <section className="mb-4 flex flex-col gap-4 text-[15px]">
            <PrintField label="Nhân Viên Đặt" value={order.createdByName} />
            <PrintField label="Loại Xuất" value={kind.label} />
            <PrintField label="NV Nhận - Kiểm Hàng" />
            <PrintField label="Thông Tin Phiếu" value={order.note} />
            <PrintField label="SL Kiện / Kg" />
          </section>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="italic">
                <th className={`${printCell} w-10`}>STT</th>
                <th className={`${printCell} w-44`}>Mã Hàng</th>
                <th className={printCell}>Tên Hàng</th>
                <th className={`${printCell} w-16`}>SL Xuất</th>
                <th className={`${printCell} w-20`}>Khu Vực</th>
                <th className={`${printCell} w-28`}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td className={`${printCell} text-center`}>{index + 1}</td>
                  <td className={`${printCell} text-center`}>
                    <div className="font-bold">{line.productCode}</div>
                    {line.groupName ? <div className="mt-2 text-xs">{line.groupName}</div> : null}
                  </td>
                  <td className={`${printCell} text-center text-base font-bold`}>{line.productName}</td>
                  <td className={`${printCell} text-center`}>
                    {line.orderedQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className={`${printCell} text-center text-base`}>{line.defaultWarehouseName ?? ""}</td>
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
