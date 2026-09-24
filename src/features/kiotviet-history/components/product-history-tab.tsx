"use client";

import { Segmented, Typography } from "antd";
import { useState } from "react";

import { useKiotVietHistory } from "../hooks/useKiotVietHistory";
import { DEFAULT_HISTORY_FILTER, type KiotVietHistoryType } from "../schemas/history-filter.schema";
import { HistoryTable } from "./history-table";
import { VoucherDrawer } from "./voucher-drawer";

type Voucher = { type: "NHAP" | "XUAT"; voucherNo: string };

const TYPE_OPTIONS: Array<{ value: KiotVietHistoryType; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "NHAP", label: "Nhập" },
  { value: "XUAT", label: "Bán" },
];

/** Tab lịch sử KiotViet nhúng vào chi tiết một mã hàng (D-11) — cùng lớp dữ liệu với /lich-su-kiotviet. */
export function ProductHistoryTab({ productId }: { productId: string }) {
  const [type, setType] = useState<KiotVietHistoryType>("");
  const [page, setPage] = useState(1);
  const [openVoucher, setOpenVoucher] = useState<Voucher | null>(null);

  const history = useKiotVietHistory(
    { ...DEFAULT_HISTORY_FILTER, type, page },
    { productId },
  );

  return (
    <>
      <Typography.Text type="secondary" className="mb-3 block text-xs">
        Dòng cũ từ KiotViet, tách khỏi Thẻ kho vì không có tồn lũy kế.
      </Typography.Text>

      <Segmented
        className="mb-3"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(value) => {
          setType(value as KiotVietHistoryType);
          setPage(1);
        }}
      />

      <HistoryTable
        query={history}
        page={page}
        pageSize={DEFAULT_HISTORY_FILTER.pageSize}
        onPageChange={(next) => setPage(next)}
        onOpenVoucher={(voucherType, voucherNo) =>
          setOpenVoucher({ type: voucherType, voucherNo })
        }
        hideProductColumns
      />

      <VoucherDrawer voucher={openVoucher} onClose={() => setOpenVoucher(null)} />
    </>
  );
}
