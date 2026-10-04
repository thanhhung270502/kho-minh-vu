"use client";

import { AppstoreOutlined, ExclamationCircleOutlined, ImportOutlined, ShoppingCartOutlined } from "@ant-design/icons";

import { changeRatio, type PeriodKpis } from "../lib/period-analysis";
import { ChangePill, StatCard } from "./stat-card";

const n = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

type Props = {
  kpis: PeriodKpis;
  /** Mã cần nhập ngay bây giờ (nhịp bán 30 ngày) + tổng số lượng đề nghị. */
  reorder: { products: number; quantity: number };
};

/** Hàng 4 thẻ KPI đầu tab Phân tích — 3 thẻ trong kỳ (so kỳ trước) + 1 thẻ cần nhập. */
export function PeriodKpiCards({ kpis, reorder }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<ShoppingCartOutlined />}
        label="Xuất bán"
        value={n(kpis.sold)}
        change={<ChangePill ratio={changeRatio(kpis.sold, kpis.soldPrev)} previous={n(kpis.soldPrev)} />}
        footnote={`${n(kpis.invoiceCount)} hóa đơn`}
      />
      <StatCard
        icon={<ImportOutlined />}
        label="Nhập hàng"
        value={n(kpis.received)}
        change={<ChangePill ratio={changeRatio(kpis.received, kpis.receivedPrev)} previous={n(kpis.receivedPrev)} />}
        footnote={`${n(kpis.receiptCount)} phiếu nhập`}
      />
      <StatCard
        icon={<AppstoreOutlined />}
        label="Mã có bán"
        value={n(kpis.sellingProducts)}
        change={<ChangePill ratio={changeRatio(kpis.sellingProducts, kpis.sellingProductsPrev)} previous={n(kpis.sellingProductsPrev)} />}
        footnote="số mã có hóa đơn trong kỳ"
      />
      <StatCard
        icon={<ExclamationCircleOutlined />}
        label="Mã cần nhập"
        value={n(reorder.products)}
        footnote={`tổng ${n(reorder.quantity)} cần nhập · tính tại hôm nay`}
      />
    </div>
  );
}
