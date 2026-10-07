"use client";

import { Card, Select } from "antd";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { changeRatio } from "../lib/period-analysis";
import { stepLabel, type SeriesStep } from "../lib/period";
import type { FlowPoint } from "../types";
import { ChangePill } from "./stat-card";

type Metric = "sold" | "received";
const METRIC_LABELS: Record<Metric, string> = { sold: "Xuất hàng", received: "Nhập hàng" };
const COLORS: Record<Metric, string> = { sold: "#2f54eb", received: "#13a8a8" };
const STEP_TEXT: Record<SeriesStep, string> = { ngay: "theo ngày", tuan: "theo tuần", thang: "theo tháng" };

type Props = {
  points: FlowPoint[];
  step: SeriesStep;
  /** Tổng kỳ trước — ô % cạnh tổng kỳ này. */
  previous: Record<Metric, number>;
};

/** "Xuất hàng theo thời gian" — đường mềm có tô nền, tổng kỳ + % so kỳ trước ở đầu thẻ. */
export function TrendChart({ points, step, previous }: Props) {
  const [metric, setMetric] = useState<Metric>("sold");
  const data = points.map((p) => ({ label: stepLabel(step, p.date), value: p[metric] }));
  const total = points.reduce((s, p) => s + p[metric], 0);

  return (
    <Card
      size="small"
      className="rounded-xl"
      title={`${METRIC_LABELS[metric]} ${STEP_TEXT[step]}`}
      extra={
        <Select<Metric>
          size="small"
          className="w-32"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
        />
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl font-semibold tabular-nums">{total.toLocaleString("vi-VN")}</span>
        <ChangePill ratio={changeRatio(total, previous[metric])} previous={previous[metric].toLocaleString("vi-VN")} />
        <span className="text-xs text-chu-phu">so với kỳ trước</span>
      </div>
      {data.length === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-chu-phu">Không có số liệu trong kỳ.</div>
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[metric]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[metric]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString("vi-VN"), METRIC_LABELS[metric]]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS[metric]}
                strokeWidth={2}
                fill={`url(#fill-${metric})`}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
