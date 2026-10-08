"use client";

import { Button } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Khung chung của 3 phiếu in (đơn đặt, duyệt đơn, nhập hàng): trang A4, đầu bảng
 * lặp lại ở trang sau, nút In ẩn khi in. `children` nhận giờ in đã định dạng —
 * giờ trên phiếu là giờ BẤM IN (08/10/2026): tab mở từ trước vẫn in đúng phút bấm.
 */
export function PrintSheet({ children }: { children: (printedAt: string) => ReactNode }) {
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
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div data-no-print className="mb-4 flex justify-end">
        <Button
          type="primary"
          onClick={() => {
            setPrintedAt(new Date());
            window.print();
          }}
        >
          In phiếu
        </Button>
      </div>

      {children(dayjs(printedAt).format("DD/MM/YYYY HH:mm"))}
    </div>
  );
}

/** Một dòng "Nhãn : giá trị"; không có giá trị thì in dòng chấm để ghi tay. */
export function PrintField({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="flex items-end gap-1">
      <span className="shrink-0">{label} :</span>
      {empty ? <span className="mb-1 flex-1 border-b border-dotted border-black" /> : <span>{value}</span>}
    </div>
  );
}

export const printCell = "border border-black px-1 py-1";
