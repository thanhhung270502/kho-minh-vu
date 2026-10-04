"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type RankItem = {
  key: string;
  /** Có link thì tiêu đề bấm được (mở chi tiết mã hàng). */
  href?: string;
  title: string;
  subtitle?: string;
  value: string;
  note?: ReactNode;
  /** 0..1 — độ dài thanh so với dòng lớn nhất. */
  ratio: number;
};

type Props = {
  items: RankItem[];
  empty: string;
  /** Màu thanh: xanh cho bán, cam cho tồn chậm. */
  tone?: "blue" | "green" | "red" | "orange";
  monoTitle?: boolean;
};

const BAR: Record<NonNullable<Props["tone"]>, string> = {
  blue: "bg-[#2f54eb]",
  green: "bg-green-500",
  red: "bg-red-500",
  orange: "bg-orange-400",
};

/** Danh sách xếp hạng gọn: số thứ tự, tên, số bên phải, thanh tỉ lệ bên dưới. */
export function RankList({ items, empty, tone = "blue", monoTitle = true }: Props) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-sm text-chu-phu">{empty}</div>;
  }
  return (
    <ol className="m-0 list-none p-0">
      {items.map((it, i) => (
        <li key={it.key} className="flex items-start gap-3 border-b border-gray-100 py-2 last:border-b-0">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
              i < 3 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              {it.href ? (
                <Link href={it.href} className={`truncate text-sm ${monoTitle ? "font-mono" : ""}`}>
                  {it.title}
                </Link>
              ) : (
                <span className={`truncate text-sm font-medium ${monoTitle ? "font-mono" : ""}`}>{it.title}</span>
              )}
              <span className="shrink-0 text-sm font-semibold tabular-nums">{it.value}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-chu-phu">
              <span className="truncate">{it.subtitle}</span>
              {it.note ? <span className="shrink-0">{it.note}</span> : null}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(2, Math.min(1, it.ratio) * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
