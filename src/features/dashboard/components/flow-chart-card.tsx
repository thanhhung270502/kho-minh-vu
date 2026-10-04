"use client";

import { Segmented } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { QueryState } from "@/shared/components/query-state";
import { CHART_COLORS } from "@/shared/lib/design-tokens";

import type { FlowRange } from "../api/dashboard.api";
import { useFlowByDay } from "../hooks/useDashboard";
import type { FlowDay } from "../types";

const fmt = (value: number) => value.toLocaleString("vi-VN");

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-chu-phu">
      <span className="size-2 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function FlowTooltip({ active, payload }: { active?: boolean; payload?: { payload: FlowDay }[] }) {
  const day = active ? payload?.[0]?.payload : undefined;
  if (!day) return null;
  return (
    <div className="rounded-lg border border-vien bg-nen-the px-3 py-2 text-[12px] shadow-sm">
      <div className="font-semibold">{dayjs(day.date).format("DD/MM/YYYY")}</div>
      <div>
        Nhập: {fmt(day.receiptCount)} phiếu · SL {fmt(day.receiptQuantity)}
      </div>
      <div>
        Xuất: {fmt(day.issueCount)} phiếu · SL {fmt(day.issueQuantity)}
      </div>
    </div>
  );
}

export function FlowChartCard() {
  const [days, setDays] = useState<FlowRange>(30);
  const flow = useFlowByDay(days);

  return (
    <div className="rounded-the border border-vien bg-nen-the p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-[15px] font-extrabold">Nhập – Xuất</h2>
        <Legend color={CHART_COLORS[0]} label="Nhập" />
        <Legend color={CHART_COLORS[1]} label="Xuất" />
        <div className="ml-auto">
          <Segmented
            size="small"
            value={days}
            onChange={(value) => setDays(value as FlowRange)}
            options={[
              { label: "7N", value: 7 },
              { label: "30N", value: 30 },
              { label: "90N", value: 90 },
            ]}
          />
        </div>
      </div>
      <QueryState
        query={flow}
        isEmpty={(rows) => rows.every((d) => d.receiptCount === 0 && d.issueCount === 0)}
        emptyDescription={`Chưa có phiếu nhập hay hóa đơn nào ghi sổ trong ${days} ngày qua.`}
      >
        {(rows) => (
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barGap={1} barCategoryGap={days === 90 ? 1 : 4}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => dayjs(d).format("D/M")}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E5E5" }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={{ fontSize: 11.5, fill: "#A3A3A3" }}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip content={<FlowTooltip />} cursor={{ fill: "#F5F5F5" }} />
                <Bar dataKey="receiptCount" name="Nhập" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="issueCount" name="Xuất" fill={CHART_COLORS[1]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </QueryState>
    </div>
  );
}
