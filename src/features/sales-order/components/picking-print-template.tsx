"use client";

import {
  PrintColumns,
  PrintField,
  PrintSheet,
  printBodyRow,
  printCell,
  printCompanyText,
  printHeadRow,
  printItemText,
  printQtyText,
  printSpacer,
  printTable,
} from "@/shared/components/print-sheet";
import {
  COMPANY_ADDRESS,
  COMPANY_NAME,
  INTERNAL_ONLY_NOTICE,
  exportKindOf,
} from "@/shared/lib/print-info";

import type { OrderDetail, OrderLine } from "../types";

/** Độ rộng cột của sheet "Xuất kho" trong file mẫu in (17/10/2026). */
const COLUMN_WIDTHS = [7, 20.1, 44.3, 9, 10, 14];

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
          <div className={printSpacer} />
          <header className="text-center">
            <div className={printCompanyText}>{COMPANY_NAME}</div>
            <div className="text-[11pt] leading-[18pt]">Địa Chỉ : {COMPANY_ADDRESS}</div>
            <div className={printSpacer} />
            <div className="text-[12pt] leading-[20.1pt] font-bold">Phiếu Xuất Kho</div>
            <div className="text-[11pt] leading-[18pt]">Mã đơn hàng: {order.orderNo}</div>
            <div className="text-[11pt] leading-[18pt]">{printedAt}</div>
          </header>

          <div className={printSpacer} />
          <section>
            <PrintField label="Nhân Viên Đặt" value={order.createdByName} />
            <PrintField label="Loại Xuất" value={kind.label} />
            <PrintField label="NV Nhận - Kiểm Hàng" />
            <PrintField label="Thông Tin Phiếu" value={order.note} />
            <PrintField label="SL Kiện / Kg" />
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
                  <td className={printCell}>
                    <div className={printItemText}>{line.productCode}</div>
                    {line.groupName ? <div className="text-[9pt]">{line.groupName}</div> : null}
                  </td>
                  <td className={`${printCell} ${printItemText}`}>{line.productName}</td>
                  <td className={`${printCell} ${printQtyText}`}>
                    {line.orderedQuantity.toLocaleString("vi-VN")}
                  </td>
                  <td className={printCell}>{line.defaultWarehouseName ?? ""}</td>
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
