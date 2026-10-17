"use client";

import { Button } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Khung chung của 4 phiếu in (đơn đặt, duyệt đơn, nhập hàng, kiểm kho): trang A4, đầu bảng
 * lặp lại ở trang sau, nút In ẩn khi in. `children` nhận giờ in đã định dạng —
 * giờ trên phiếu là giờ BẤM IN (08/10/2026): tab mở từ trước vẫn in đúng phút bấm.
 *
 * Tỉ lệ in theo file "Mau_In_Kho_Minh_Vu đã chỉnh.xlsx" (17/10/2026): A4 dọc, lề trái/phải
 * 0,4", trên/dưới 0,5", chữ Arial, cỡ chữ tính bằng pt như Excel để bản in ra đúng cỡ.
 */
export function PrintSheet({ children }: { children: (printedAt: string) => ReactNode }) {
  const [printedAt, setPrintedAt] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setPrintedAt(new Date());
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, []);

  return (
    <div
      className="mx-auto max-w-[210mm] bg-white p-6 text-black print:max-w-none print:p-0"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <style>{`
        @page { size: A4 portrait; margin: 0.5in 0.4in; }
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
    <div className={`${printInfoLine} gap-1`}>
      <span className="shrink-0">{label} :</span>
      {empty ? <span className="mb-1 flex-1 self-end border-b border-dotted border-black" /> : <span>{value}</span>}
    </div>
  );
}

/**
 * Độ rộng cột theo đơn vị cột Excel của file mẫu, đổi ra phần trăm — bảng luôn trải
 * đủ bề ngang trang như "Fit to 1 page wide" của Excel.
 */
export function PrintColumns({ widths }: { widths: number[] }) {
  const total = widths.reduce((sum, width) => sum + width, 0);
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={{ width: `${((width / total) * 100).toFixed(2)}%` }} />
      ))}
    </colgroup>
  );
}

/** Bảng in: cột cố định theo `PrintColumns`, chữ xuống dòng trong ô. */
export const printTable = "w-full table-fixed border-collapse";
export const printCell = "border border-black px-1 py-1 text-center align-middle break-words";
/** Hàng tiêu đề bảng cao 30pt, chữ 11pt đậm. */
export const printHeadRow = "h-[30pt] text-[11pt] font-bold";
/** Hàng hàng hóa cao 62pt — chừa chỗ ghi tay và đọc từ xa trong kho. */
export const printBodyRow = "h-[62pt] text-[11pt]";
/** Mã hàng / tên hàng: 12pt đậm. */
export const printItemText = "text-[12pt] font-bold";
/** Số lượng: 11pt đậm. */
export const printQtyText = "text-[11pt] font-bold";

/** Đầu phiếu: tên công ty 14pt đậm, địa chỉ 10pt, tên phiếu 12pt đậm, mã/ngày 9pt. */
export const printCompanyText = "text-[14pt] font-bold leading-[21.9pt]";
export const printAddressText = "text-[10pt] leading-[18pt]";
export const printTitleText = "text-[12pt] font-bold leading-[21.9pt]";
export const printMetaText = "text-[9pt] leading-[18pt]";
/** Dòng thông tin dưới đầu phiếu: cao 20pt, chữ 11pt. */
export const printInfoLine = "flex h-[20.1pt] items-center text-[11pt]";
/** Dòng trống ngăn giữa các khối, bằng một hàng Excel mặc định (15pt). */
export const printSpacer = "h-[15pt]";
