"use client";

import { Card, Statistic } from "antd";

import { kpisOf } from "../lib/analysis";
import type { AnalysisRow, AnalysisSettings } from "../types";

const pct = (n: number) => `${(n * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

export function KpiCards({ rows, settings }: { rows: AnalysisRow[]; settings: AnalysisSettings }) {
  const k = kpisOf(rows, settings);
  const cards = [
    {
      title: `Cần nhập trong ${settings.yellowDays} ngày`,
      value: k.needSoon.count,
      note: `${pct(k.needSoon.total ? k.needSoon.count / k.needSoon.total : 0)} số mã`,
    },
    {
      title: "Hết hàng, vẫn có khách mua",
      value: k.outWithDemand.count,
      note: `trên ${k.outWithDemand.outTotal.toLocaleString("vi-VN")} mã tồn ≤ 0`,
    },
    {
      title: "Tổng số lượng tồn",
      value: k.totalStock.quantity,
      note: `${k.totalStock.productsInStock.toLocaleString("vi-VN")} mã còn hàng — cộng mọi ĐVT`,
    },
    {
      title: "Tồn không có tín hiệu bán",
      value: k.noSalesStock.quantity,
      note: `${pct(k.noSalesStock.share)} tổng tồn · ${k.noSalesStock.products.toLocaleString("vi-VN")} mã`,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title} size="small">
          <Statistic title={c.title} value={c.value} groupSeparator="." />
          <div className="mt-1 text-xs text-chu-phu">{c.note}</div>
        </Card>
      ))}
    </div>
  );
}
