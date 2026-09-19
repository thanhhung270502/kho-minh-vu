"use client";

import { Button } from "antd";
import dayjs from "dayjs";

import type { ChiTietPhieu, DongPhieu } from "../types";
import { NHAN_NGUON_NHAP } from "../types";

function so(v: number | string | null): string {
  return v === null ? "" : Number(v).toLocaleString("vi-VN");
}

/**
 * D-14: bản in KHÔNG có đơn giá và thành tiền. Đây là giấy ký nhận hàng ở kho,
 * không phải chứng từ kế toán — giá xem trên màn hình.
 */
export function MauInPhieuNhap({
  phieu,
  dong,
}: {
  phieu: ChiTietPhieu;
  dong: DongPhieu[];
}) {
  const tongSoLuong = dong.reduce((t, d) => t + Number(d.so_luong), 0);

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .khong-in { display: none !important; }
          body { background: #fff; }
          /* Đầu bảng lặp lại ở trang sau — phiếu 48 dòng tràn sang trang hai. */
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="khong-in mb-4 flex justify-end">
        <Button type="primary" onClick={() => window.print()}>
          In phiếu
        </Button>
      </div>

      <header className="mb-4 text-center">
        <div className="text-sm uppercase">CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ</div>
        <h1 className="my-2 text-xl font-bold uppercase">Phiếu nhập kho</h1>
        <div className="text-sm">
          Số: <strong className="font-mono">{phieu.so_ct}</strong> · Ngày{" "}
          {dayjs(phieu.ngay_ct).format("DD/MM/YYYY")}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-gray-600">Nhà cung cấp: </span>
          <strong>{phieu.ten_doi_tac ?? "—"}</strong>
        </div>
        <div>
          <span className="text-gray-600">Kho: </span>
          {phieu.ten_kho ?? "—"}
        </div>
        <div>
          <span className="text-gray-600">Nguồn nhập: </span>
          {phieu.nguon_nhap ? NHAN_NGUON_NHAP[phieu.nguon_nhap] : "—"}
        </div>
        <div>
          <span className="text-gray-600">Người lập: </span>
          {phieu.ho_ten_nguoi_tao ?? "—"}
        </div>
        {phieu.ghi_chu ? (
          <div className="col-span-2">
            <span className="text-gray-600">Ghi chú: </span>
            {phieu.ghi_chu}
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
          {dong.map((d, i) => (
            <tr key={d.id}>
              <td className="border border-gray-400 p-1">{i + 1}</td>
              <td className="border border-gray-400 p-1 font-mono">{d.ma_hang}</td>
              <td className="border border-gray-400 p-1">{d.ten_hang}</td>
              <td className="border border-gray-400 p-1">{d.ten_dvt}</td>
              <td className="border border-gray-400 p-1">{d.ten_kho}</td>
              <td className="border border-gray-400 p-1 text-right">{so(d.so_luong)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1" colSpan={5}>
              Tổng cộng — {dong.length} dòng
            </td>
            <td className="border border-gray-400 p-1 text-right">{so(tongSoLuong)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-10 grid grid-cols-3 gap-4 text-center text-sm">
        {["Người giao hàng", "Thủ kho", "Người lập phiếu"].map((v) => (
          <div key={v}>
            <div className="font-semibold">{v}</div>
            <div className="text-xs text-gray-600">(ký, ghi rõ họ tên)</div>
            <div className="h-16" />
          </div>
        ))}
      </section>
    </div>
  );
}
