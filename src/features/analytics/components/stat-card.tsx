"use client";

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Tooltip } from "antd";
import type { ReactNode } from "react";

/** Ô nhỏ "↑ 16%" xanh / "↓ 24%" đỏ — null (kỳ trước = 0) thì không hiện. */
export function ChangePill({ ratio, previous }: { ratio: number | null; previous?: string }) {
  if (ratio === null) return null;
  const up = ratio >= 0;
  const pill = (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-xs font-medium tabular-nums ${
        up ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"
      }`}
    >
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(ratio * 100).toLocaleString("vi-VN", { maximumFractionDigits: ratio !== 0 && Math.abs(ratio) < 0.1 ? 1 : 0 })}%
    </span>
  );
  return previous ? <Tooltip title={`Kỳ trước: ${previous}`}>{pill}</Tooltip> : pill;
}

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
  change?: ReactNode;
  footnote?: ReactNode;
};

/** Thẻ KPI: icon trong ô bo góc, nhãn, số lớn, % so kỳ trước bên phải. */
export function StatCard({ icon, label, value, change, footnote }: Props) {
  return (
    <Card size="small" className="rounded-xl">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-base text-gray-600">
        {icon}
      </div>
      <div className="text-sm text-chu-phu">{label}</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {change}
      </div>
      {footnote ? <div className="mt-1 text-xs text-chu-phu">{footnote}</div> : null}
    </Card>
  );
}
