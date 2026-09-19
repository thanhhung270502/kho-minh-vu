"use client";

import { Button } from "antd";
import dayjs from "dayjs";

import type { DocumentDetail, DocumentLine } from "../types";
import { RECEIPT_SOURCE_LABELS } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

/**
 * D-14: bản in KHÔNG có đơn giá và thành tiền. Đây là giấy ký nhận hàng ở kho,
 * không phải chứng từ kế toán — giá xem trên màn hình.
 */
export function ReceiptPrintTemplate({
  receipt,
  lines,
}: {
  receipt: DocumentDetail;
  lines: DocumentLine[];
}) {
  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: #fff; }
          /* Đầu bảng lặp lại ở page sau — phiếu 48 dòng tràn sang page hai. */
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div data-no-print className="mb-4 flex justify-end">
        <Button type="primary" onClick={() => window.print()}>
          In phiếu
        </Button>
      </div>

      <header className="mb-4 text-center">
        <div className="text-sm uppercase">CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ</div>
        <h1 className="my-2 text-xl font-bold uppercase">Phiếu nhập kho</h1>
        <div className="text-sm">
          Số: <strong className="font-mono">{receipt.docNo}</strong> · Ngày{" "}
          {dayjs(receipt.docDate).format("DD/MM/YYYY")}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-gray-600">Nhà cung cấp: </span>
          <strong>{receipt.partnerName ?? "—"}</strong>
        </div>
        <div>
          <span className="text-gray-600">Kho: </span>
          {receipt.warehouseName ?? "—"}
        </div>
        <div>
          <span className="text-gray-600">Nguồn nhập: </span>
          {receipt.source ? RECEIPT_SOURCE_LABELS[receipt.source] : "—"}
        </div>
        <div>
          <span className="text-gray-600">Người lập: </span>
          {receipt.createdByName ?? "—"}
        </div>
        {receipt.note ? (
          <div className="col-span-2">
            <span className="text-gray-600">Ghi chú: </span>
            {receipt.note}
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
            <th className="border border-gray-400 p-1 text-left">Kho</th>
            <th className="border border-gray-400 p-1 text-right">Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id}>
              <td className="border border-gray-400 p-1">{index + 1}</td>
              <td className="border border-gray-400 p-1 font-mono">{line.productCode}</td>
              <td className="border border-gray-400 p-1">{line.productName}</td>
              <td className="border border-gray-400 p-1">{line.unitName}</td>
              <td className="border border-gray-400 p-1">{line.warehouseName}</td>
              <td className="border border-gray-400 p-1 text-right">{formatNumber(line.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1" colSpan={5}>
              Tổng cộng — {lines.length} dòng
            </td>
            <td className="border border-gray-400 p-1 text-right">{formatNumber(totalQuantity)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-10 grid grid-cols-3 gap-4 text-center text-sm">
        {["Người giao hàng", "Thủ kho", "Người lập phiếu"].map((role) => (
          <div key={role}>
            <div className="font-semibold">{role}</div>
            <div className="text-xs text-gray-600">(ký, ghi rõ họ tên)</div>
            <div className="h-16" />
          </div>
        ))}
      </section>
    </div>
  );
}
