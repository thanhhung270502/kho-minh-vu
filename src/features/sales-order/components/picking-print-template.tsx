"use client";

import { Button } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import { isInternalPartnerCode, lineRecipientLabel, recipientDisplayName } from "@/shared/lib/recipient";

import { groupLinesByWarehouse } from "../lib/group-lines-by-warehouse";
import type { OrderDetail, OrderLine } from "../types";

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

/**
 * D-08/D-09: giấy đi lấy hàng cho kho, in TỪ ĐƠN đã xác nhận — không phải
 * chứng từ kế toán. Không giá, không tồn hiện tại (số cũ ngay khi in xong),
 * không cột công đoạn, không ô ký nhận. Cột cuối để trống, kho ghi tay số
 * thực lấy. Xếp theo kho rồi theo mã hàng, mỗi kho một dòng tiêu đề nhóm
 * (Claude's Discretion, 04-CONTEXT.md) — xem `group-lines-by-warehouse.ts`.
 * Phase 17: in tên người nhận (không mã), người đặt và giờ in; bỏ ngày giao dự kiến.
 * Phase 18 (D4): một tờ chung — đầu phiếu liệt kê mọi nhân viên nhận, cột Người nhận
 * theo dòng; dòng chung ghi "Chung" khi đơn ≥ 2 nhân viên.
 */
export function PickingPrintTemplate({
  order,
  lines,
}: {
  order: OrderDetail;
  lines: OrderLine[];
}) {
  const rows = groupLinesByWarehouse(lines);
  const { partner, staff } = order.recipients;
  const totalQuantity = lines.reduce((sum, line) => sum + line.orderedQuantity, 0);

  // Giờ in là sự kiện phía trình duyệt: tab mở từ trước vẫn in đúng phút bấm in.
  const [printedAt, setPrintedAt] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setPrintedAt(new Date());
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, []);

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: #fff; }
          /* Đầu bảng lặp lại ở page sau — đơn nhiều dòng tràn sang page hai. */
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div data-no-print className="mb-4 flex justify-end">
        <Button type="primary" onClick={() => {
            setPrintedAt(new Date());
            window.print();
          }}>
          In phiếu
        </Button>
      </div>

      <header className="mb-4 text-center">
        <div className="text-sm uppercase">CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ</div>
        <h1 className="my-2 text-xl font-bold uppercase">Phiếu đi lấy hàng</h1>
        <div className="text-sm">
          Đơn số: <strong className="font-mono">{order.orderNo}</strong> · Ngày{" "}
          {dayjs(order.orderDate).format("DD/MM/YYYY")}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className={staff.length >= 2 ? "col-span-2" : undefined}>
          <span className="text-gray-600">Người nhận: </span>
          <strong>
            {staff.length > 0
              ? staff.map((person) => recipientDisplayName(person.name)).join(", ")
              : recipientDisplayName(partner?.name)}
          </strong>
        </div>
        {staff.length > 0 && partner && !isInternalPartnerCode(partner.code) ? (
          <div className="col-span-2">
            <span className="text-gray-600">Đối tác: </span>
            {recipientDisplayName(partner.name)}
          </div>
        ) : null}
        <div>
          <span className="text-gray-600">Người đặt: </span>
          {order.createdByName ?? "—"}
        </div>
        <div className="col-span-2">
          <span className="text-gray-600">In lúc: </span>
          {dayjs(printedAt).format("HH:mm DD/MM/YYYY")}
        </div>
        {order.note ? (
          <div className="col-span-2">
            <span className="text-gray-600">Ghi chú: </span>
            {order.note}
          </div>
        ) : null}
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-black">
            <th className="border border-gray-400 p-1 text-left">STT</th>
            <th className="border border-gray-400 p-1 text-left">Mã hàng</th>
            <th className="border border-gray-400 p-1 text-left">Tên hàng</th>
            <th className="border border-gray-400 p-1 text-left">ĐVT</th>
            <th className="border border-gray-400 p-1 text-left">Người nhận</th>
            <th className="border border-gray-400 p-1 text-right">SL đặt</th>
            <th className="border border-gray-400 p-1 text-left">SL thực lấy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.kind === "group" ? (
              <tr key={`kho-${row.warehouseName}`} className="bg-gray-100 font-semibold">
                <td className="border border-gray-400 p-1" colSpan={7}>
                  Kho: {row.warehouseName}
                </td>
              </tr>
            ) : (
              <tr key={row.line.id}>
                <td className="border border-gray-400 p-1">{row.index}</td>
                <td className="border border-gray-400 p-1 font-mono">
                  {row.line.productCode}
                </td>
                <td className="border border-gray-400 p-1">{row.line.productName}</td>
                <td className="border border-gray-400 p-1">{row.line.unitName}</td>
                <td className="border border-gray-400 p-1">
                  {lineRecipientLabel(row.line.recipientName, staff.length)}
                </td>
                <td className="border border-gray-400 p-1 text-right">
                  {formatNumber(row.line.orderedQuantity)}
                </td>
                <td className="border border-gray-400 p-1" />
              </tr>
            ),
          )}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1" colSpan={5}>
              Tổng cộng — {lines.length} dòng
            </td>
            <td className="border border-gray-400 p-1 text-right">
              {formatNumber(totalQuantity)}
            </td>
            <td className="border border-gray-400 p-1" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
