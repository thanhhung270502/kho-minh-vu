"use client";

import { Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { QueryState } from "@/shared/components/query-state";

import { useKiotVietVoucher } from "../hooks/useKiotVietHistory";
import type { KiotVietHistoryRow } from "../types";

type Voucher = { type: "NHAP" | "XUAT"; voucherNo: string };

type Props = {
  voucher: Voucher | null;
  onClose: () => void;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatHistoryDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_TIME_FORMATTER.format(date).replace(",", "");
}

function formatQuantity(value: number): string {
  return value.toLocaleString("vi-VN");
}

const LINE_COLUMNS: ColumnsType<KiotVietHistoryRow> = [
  { title: "Mã hàng", dataIndex: "productCode", width: 120 },
  { title: "Tên hàng", dataIndex: "productName", ellipsis: true },
  {
    title: "Số lượng",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    render: formatQuantity,
  },
];

/** Mở lại nguyên phiếu KiotViet — mọi dòng của cùng số phiếu (D-10 mục 4). */
export function VoucherDrawer({ voucher, onClose }: Props) {
  const query = useKiotVietVoucher(voucher?.type ?? "NHAP", voucher?.voucherNo ?? "");

  const title = voucher
    ? voucher.type === "NHAP"
      ? `Phiếu nhập KiotViet ${voucher.voucherNo}`
      : `Hóa đơn KiotViet ${voucher.voucherNo}`
    : "";

  return (
    <Drawer
      open={voucher !== null}
      onClose={onClose}
      title={title}
      placement="right"
      size={560}
      destroyOnHidden
    >
      <QueryState
        query={query}
        isEmpty={(rows) => rows.length === 0}
        emptyDescription="Không tìm thấy dòng nào cho phiếu này."
      >
        {(rows) => {
          const first = rows[0];
          const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

          return (
            <>
              <div className="mb-4 grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-gray-500">Ngày</span>
                <span>{formatHistoryDate(first?.date ?? null)}</span>
                <span className="text-gray-500">
                  {voucher?.type === "NHAP" ? "Nhà cung cấp" : "Khách hàng"}
                </span>
                <span>{first?.partner ?? "—"}</span>
                {first?.note ? (
                  <>
                    <span className="text-gray-500">Ghi chú</span>
                    <span>{first.note}</span>
                  </>
                ) : null}
              </div>

              <Table<KiotVietHistoryRow>
                rowKey={(row, index) => `${row.productCode}-${index}`}
                size="small"
                columns={LINE_COLUMNS}
                dataSource={rows}
                pagination={false}
              />
              <p className="mt-2 text-right text-sm font-medium">
                Tổng số lượng: {formatQuantity(totalQuantity)}
              </p>
              <p className="mt-4 text-xs text-gray-500">
                Dữ liệu lưu trữ từ KiotViet — chỉ để tra cứu, không nằm trong sổ kho.
              </p>
            </>
          );
        }}
      </QueryState>
    </Drawer>
  );
}
