"use client";

import { Card } from "antd";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { stepLabel, type SeriesStep } from "../lib/period";
import type { FlowPoint } from "../types";

const STEP_TEXT: Record<SeriesStep, string> = { ngay: "theo ngày", tuan: "theo tuần", thang: "theo tháng" };

/** Nhập – xuất bán theo từng mốc trong kỳ (ngày / tuần / tháng). */
export function FlowChart({ points, step }: { points: FlowPoint[]; step: SeriesStep }) {
  const data = points.map((p) => ({ label: stepLabel(step, p.date), nhap: p.received, xuat: p.sold }));
  return (
    <Card size="small" title={`Nhập – Xuất ${STEP_TEXT[step]}`}>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-chu-phu">Không có nhập / xuất nào trong kỳ.</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => Number(v).toLocaleString("vi-VN")} />
              <Legend />
              <Bar dataKey="nhap" name="Nhập" fill="#1677ff" radius={[3, 3, 0, 0]} />
              <Bar dataKey="xuat" name="Xuất bán" fill="#fa8c16" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
