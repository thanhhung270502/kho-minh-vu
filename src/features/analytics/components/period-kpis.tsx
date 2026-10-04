"use client";

import { Card, Statistic, Tooltip } from "antd";

import { changeRatio, type PeriodKpis } from "../lib/period-analysis";

const n = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

function Change({ current, previous }: { current: number; previous: number }) {
  const ratio = changeRatio(current, previous);
  if (ratio === null) return <span className="text-chu-phu">kỳ trước: {n(previous)}</span>;
  const up = ratio >= 0;
  return (
    <Tooltip title={`Kỳ trước: ${n(previous)}`}>
      <span className={up ? "text-green-600" : "text-red-600"}>
        {up ? "▲" : "▼"} {Math.abs(ratio * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với kỳ trước
      </span>
    </Tooltip>
  );
}

/** KPI trong kỳ — mỗi thẻ so với kỳ trước cùng số ngày. */
export function PeriodKpiCards({ kpis }: { kpis: PeriodKpis }) {
  const cards = [
    {
      title: "Xuất bán",
      value: kpis.sold,
      note: (
        <>
          <Change current={kpis.sold} previous={kpis.soldPrev} />
          <div className="text-chu-phu">{n(kpis.invoiceCount)} hóa đơn</div>
        </>
      ),
    },
    {
      title: "Nhập hàng",
      value: kpis.received,
      note: (
        <>
          <Change current={kpis.received} previous={kpis.receivedPrev} />
          <div className="text-chu-phu">{n(kpis.receiptCount)} phiếu nhập</div>
        </>
      ),
    },
    {
      title: "Mã có bán",
      value: kpis.sellingProducts,
      note: <Change current={kpis.sellingProducts} previous={kpis.sellingProductsPrev} />,
    },
    {
      title: "Vòng quay tồn",
      value: kpis.turnover === null ? "—" : kpis.turnover.toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
      note: (
        <span className="text-chu-phu">
          Xuất bán ÷ tồn bình quân (đầu + cuối kỳ) · tồn cuối {n(kpis.closingStock)}
        </span>
      ),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title} size="small">
          <Statistic title={c.title} value={c.value} groupSeparator="." />
          <div className="mt-1 text-xs">{c.note}</div>
        </Card>
      ))}
    </div>
  );
}
