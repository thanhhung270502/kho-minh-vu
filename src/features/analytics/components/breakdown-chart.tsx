"use client";

import { Card, Segmented } from "antd";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";

import {
  BREAKDOWN_DIMENSIONS,
  BREAKDOWN_LABELS,
  breakdown,
  type BreakdownDimension,
  type CodeNamer,
} from "../lib/period-analysis";
import type { PeriodRow } from "../types";

/** Cơ cấu xuất bán theo hãng / dòng / linh kiện / xử lý / nhóm — top 10, so kỳ trước. */
export function BreakdownChart({ rows }: { rows: PeriodRow[] }) {
  const [dimension, setDimension] = useState<BreakdownDimension>("hang");
  const { dictionary } = useCodeDictionary();

  const data = useMemo(() => {
    const namer: CodeNamer = {
      brand: (b) => dictionary.brands.get(b) ?? b,
      model: (b, m) => dictionary.pairs.get(b + m)?.model ?? m,
      part: (p) => dictionary.parts.get(p) ?? p,
    };
    return breakdown(rows, dimension, namer);
  }, [rows, dimension, dictionary]);

  return (
    <Card size="small" title="Cơ cấu xuất bán (top 10)">
      <div className="mb-2 max-w-full overflow-x-auto">
        <Segmented<BreakdownDimension>
          size="small"
          value={dimension}
          onChange={setDimension}
          options={BREAKDOWN_DIMENSIONS.map((d) => ({ value: d, label: BREAKDOWN_LABELS[d] }))}
        />
      </div>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-chu-phu">Không có xuất bán trong kỳ.</div>
      ) : (
        <div style={{ height: Math.max(256, data.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => Number(v).toLocaleString("vi-VN")} />
              <Legend />
              <Bar dataKey="sold" name="Kỳ này" fill="#fa8c16" radius={[0, 3, 3, 0]} />
              <Bar dataKey="soldPrev" name="Kỳ trước" fill="#d9d9d9" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
