"use client";

import { Table } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";

export const fmt = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
export const pct = (v: number) => `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

const TONE = {
  blue: "bg-brand-500",
  green: "bg-green-500",
  red: "bg-red-500",
  orange: "bg-orange-400",
} as const;

export type Tone = keyof typeof TONE;

/** Số bên phải + thanh tỉ lệ mảnh bên dưới (so với dòng lớn nhất của bảng). */
export function BarValue({ value, ratio, tone = "blue" }: { value: ReactNode; ratio: number; tone?: Tone }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-semibold tabular-nums">{value}</span>
      <div className="h-1 w-full max-w-28 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`ml-auto h-full rounded-full ${TONE[tone]}`}
          style={{ width: `${Math.max(3, Math.min(1, ratio) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export type HighlightItem = { label: string; value: string; tone?: "default" | "green" | "red" | "orange" };

const HIGHLIGHT_TONE = {
  default: "text-chu-chinh",
  green: "text-green-700",
  red: "text-red-600",
  orange: "text-orange-600",
} as const;

/** Dải 2–3 số tóm tắt nằm trên đầu bảng. */
export function Highlights({ items }: { items: HighlightItem[] }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-gray-50 px-3 py-2">
          <div className="truncate text-xs text-chu-phu">{it.label}</div>
          <div className={`truncate text-base font-semibold tabular-nums ${HIGHLIGHT_TONE[it.tone ?? "default"]}`}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankBadge({ index }: { index: number }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
        index < 3 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {index + 1}
    </span>
  );
}

export function ProductCode({ id, code }: { id: string; code: string }) {
  return (
    <Link href={`/danh-muc/${id}`} className="font-mono">
      {code}
    </Link>
  );
}

/** Cột "#" dùng chung — vị trí trong bảng xếp hạng. */
export function rankColumn<T>(): TableColumnsType<T>[number] {
  return { title: "#", key: "rank", width: 48, align: "center", render: (_: unknown, __: T, i: number) => <RankBadge index={i} /> };
}

type CompactProps<T> = {
  rowKey: keyof T & string;
  columns: TableColumnsType<T>;
  data: T[];
  empty: string;
};

/** Bảng xếp hạng gọn: không phân trang, cuộn ngang trong khung khi màn hẹp. */
export function CompactTable<T extends object>({ rowKey, columns, data, empty }: CompactProps<T>) {
  // scroll.x của antd tự cuộn ngang trong khung bảng; bọc thêm div overflow-x sẽ
  // kéo theo overflow-y: auto và hiện thanh cuộn dọc thừa.
  return (
    <Table<T>
      rowKey={rowKey}
      size="small"
      pagination={false}
      columns={columns}
      dataSource={data}
      scroll={{ x: 560 }}
      locale={{ emptyText: empty }}
    />
  );
}
