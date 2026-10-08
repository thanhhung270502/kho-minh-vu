"use client";

import { Card, Select } from "antd";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";

import {
  BREAKDOWN_DIMENSIONS,
  BREAKDOWN_LABELS,
  breakdown,
  type BreakdownDimension,
  type CodeNamer,
} from "../lib/period-analysis";
import type { PeriodRow } from "../types";

/** Cơ cấu xuất hàng theo hãng / dòng / linh kiện / xử lý / nhóm — thanh ngang, top 8. */
export function BreakdownChart({ rows }: { rows: PeriodRow[] }) {
  const [dimension, setDimension] = useState<BreakdownDimension>("hang");
  const { dictionary } = useCodeDictionary();

  const data = useMemo(() => {
    const namer: CodeNamer = {
      brand: (b) => dictionary.brands.get(b) ?? b,
      model: (b, m) => dictionary.pairs.get(b + m)?.model ?? m,
      part: (p) => dictionary.parts.get(p) ?? p,
    };
    return breakdown(rows, dimension, namer, 8);
  }, [rows, dimension, dictionary]);

  return (
    <Card
      size="small"
      className="rounded-xl"
      title={`Xuất hàng theo ${BREAKDOWN_LABELS[dimension].toLowerCase()}`}
      extra={
        <Select<BreakdownDimension>
          size="small"
          className="w-32"
          value={dimension}
          onChange={setDimension}
          options={BREAKDOWN_DIMENSIONS.map((d) => ({ value: d, label: BREAKDOWN_LABELS[d] }))}
        />
      }
    >
      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-chu-phu">Không có xuất hàng trong kỳ.</div>
      ) : (
        <div style={{ height: Math.max(288, data.length * 46 + 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barCategoryGap="14%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, name) => [Number(v).toLocaleString("vi-VN"), name === "sold" ? "Kỳ này" : "Kỳ trước"]}
              />
              <Bar dataKey="sold" fill="#2f54eb" radius={[0, 4, 4, 0]} maxBarSize={22} />
              <Bar dataKey="soldPrev" fill="#c7d2fe" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
