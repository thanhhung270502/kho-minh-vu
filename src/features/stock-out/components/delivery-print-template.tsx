"use client";

import { Button } from "antd";
import dayjs from "dayjs";

import type { IssueDetail, IssueLine } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

/**
 * XUAT-06: phiếu giao hàng đi CÙNG hàng tới người nhận — mẫu in thứ hai,
 * khác mục đích với tờ đi lấy hàng của kho (plan 04-12, `picking-print-template.tsx`).
 *
 * KHÔNG in giá: chốt 19/09 đã bỏ giá khỏi đơn, cột giá của dòng phiếu xuất
 * luôn bằng 0 ở tầng database, và giá vốn tuyệt đối không được lộ ra giấy đi
 * ra ngoài công ty. Có HAI Ô KÝ NHẬN — khác tờ đi lấy hàng (không có ô ký)
 * vì đây là bằng chứng giao hàng.
 *
 * `chi_tiet_chung_tu` hiện chưa trả số điện thoại người nhận (chỉ mã + tên) —
 * không bịa thêm cột, chờ RPC mở rộng nếu cần sau.
 */
export function DeliveryPrintTemplate({
  issue,
  lines,
}: {
  issue: IssueDetail;
  lines: IssueLine[];
}) {
  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const isDraft = issue.status !== "HOAN_THANH";

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: #fff; }
          /* Đầu bảng lặp lại ở page sau — phiếu nhiều dòng tràn sang page hai. */
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
        <h1 className="my-2 text-xl font-bold uppercase">Phiếu giao hàng</h1>
        {isDraft ? (
          <div className="font-bold text-gray-400">BẢN NHÁP — CHƯA GHI SỔ</div>
        ) : null}
        <div className="text-sm">
          Số: <strong className="font-mono">{issue.docNo}</strong> · Ngày{" "}
          {dayjs(issue.docDate).format("DD/MM/YYYY")}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-gray-600">Người nhận: </span>
          <strong>
            {issue.partnerCode ? `${issue.partnerCode} — ` : ""}
            {issue.partnerName ?? "—"}
          </strong>
        </div>
        {issue.orderNo ? (
          <div>
            <span className="text-gray-600">Đơn gốc: </span>
            {issue.orderNo}
          </div>
        ) : null}
        {issue.note ? (
          <div className="col-span-2">
            <span className="text-gray-600">Ghi chú: </span>
            {issue.note}
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
              <td className="border border-gray-400 p-1 text-right">
                {formatNumber(line.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1" colSpan={4}>
              Tổng cộng — {lines.length} dòng
            </td>
            <td className="border border-gray-400 p-1 text-right">
              {formatNumber(totalQuantity)}
            </td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
        {["Người giao hàng", "Người nhận hàng"].map((role) => (
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
