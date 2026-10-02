"use client";

import { Card, Segmented, Typography } from "antd";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { QueryState } from "@/shared/components/query-state";

import { useSalesDays } from "../hooks/useAnalytics";
import { salesPaceChange } from "../lib/analysis";
import type { Period } from "../types";

type Metric = "invoices" | "quantity";
const METRIC_LABEL: Record<Metric, string> = { invoices: "Số hóa đơn", quantity: "Số lượng bán" };

export function SalesPaceChart({ period }: { period: Period }) {
  const days = useSalesDays(period);
  const [metric, setMetric] = useState<Metric>("invoices");

  return (
    <Card
      size="small"
      title="Nhịp bán hàng"
      extra={
        <Segmented
          size="small"
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
          options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
        />
      }
    >
      <QueryState query={days} isEmpty={(d) => d.every((x) => x.invoiceCount === 0)} emptyDescription="Chưa có hóa đơn nào trong kỳ.">
        {(data) => {
          const change = salesPaceChange(data, metric);
          const key = metric === "invoices" ? "invoiceCount" : "quantity";
          return (
            <>
              <Typography.Text type="secondary" className="text-xs">
                Nửa sau kỳ so với nửa đầu (TB theo ngày có bán):{" "}
                {change === null ? "—" : `${change >= 0 ? "+" : ""}${(change * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}
              </Typography.Text>
              <div className="mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString("vi-VN"), METRIC_LABEL[metric]]} />
                    <Line type="monotone" dataKey={key} stroke="#1677ff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          );
        }}
      </QueryState>
    </Card>
  );
}
