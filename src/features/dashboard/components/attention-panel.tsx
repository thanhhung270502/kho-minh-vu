"use client";

import { Skeleton } from "antd";
import Link from "next/link";

import { QueryState } from "@/shared/components/query-state";

import { useNegativeStockReport, useOverviewKpis, useStockByGroup } from "../hooks/useDashboard";
import {
  examplesLabel,
  negativeByWarehouseLabel,
  pendingBreakdownLabel,
} from "../lib/overview-format";
import { buildStockStatusUrl } from "../lib/stock-drilldown";
import type { OverviewKpis } from "../types";

type Item = {
  key: string;
  title: string;
  /** undefined = đang tải, null = lỗi. */
  count: number | null | undefined;
  description: string;
  dot: string;
  cta: string;
  href: string;
};

const LOAD_FAILED_HINT = "Không tải được — bấm Làm mới";

function countLabel(count: number | null | undefined): string {
  if (count === undefined) return "…";
  if (count === null) return "—";
  return count.toLocaleString("vi-VN");
}

function AttentionRow({ item }: { item: Item }) {
  const empty = item.count === 0;
  return (
    <div className="flex gap-3 border-t border-vien-input py-3">
      <div
        title={item.count === null ? LOAD_FAILED_HINT : undefined}
        className={`w-[30px] shrink-0 text-[22px] leading-[1.1] font-extrabold tracking-[-0.03em] tabular-nums ${
          empty ? "text-trung-tinh-300" : ""
        }`}
      >
        {countLabel(item.count)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
          <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} />
          {item.title}
        </div>
        <div className="text-[12.5px] text-chu-phu">{empty ? "Không có" : item.description}</div>
        {empty ? null : (
          <Link
            href={item.href}
            className="mt-1 self-start rounded-full bg-nen-the px-2.5 py-[5px] text-[12.5px] font-bold text-chu-chinh shadow-[0_0_0_1px_#E5E5E5]"
          >
            {item.cta} →
          </Link>
        )}
      </div>
    </div>
  );
}

function buildItems(
  kpis: OverviewKpis,
  below: number | null | undefined,
  negative: number | null | undefined,
  negativeToday: number | null | undefined,
): Item[] {
  return [
    {
      key: "below",
      title: "Mã dưới định mức",
      count: below,
      description: examplesLabel(kpis.belowMinimumExamples, below ?? 0),
      dot: "bg-canh-bao",
      cta: "Xem mã",
      href: buildStockStatusUrl("duoi_dinh_muc"),
    },
    {
      key: "negative",
      title: "Mã tồn âm",
      count: negative,
      description: negativeByWarehouseLabel(kpis.negativeByWarehouse),
      dot: "bg-nguy-hiem",
      cta: "Kiểm kê",
      href: "/kiem-ke",
    },
    {
      key: "negative-today",
      title: "Phiếu xuất âm hôm nay",
      count: negativeToday,
      description: "Đã xuất khi tồn không đủ — kiểm phiếu nhập còn thiếu",
      dot: "bg-nguy-hiem",
      cta: "Xem phiếu",
      href: "#xuat-am",
    },
    {
      key: "pending",
      title: "Phiếu chờ ghi sổ",
      count: kpis.pendingDocs,
      description: pendingBreakdownLabel(kpis.pendingDocs, kpis.pendingReceipts, kpis.pendingIssues),
      dot: "bg-trung-tinh-400",
      cta: "Ghi sổ",
      href:
        kpis.pendingReceipts > 0
          ? "/nhap-kho?trang_thai=NHAP_LIEU"
          : "/duyet-don?trang_thai=NHAP_LIEU",
    },
  ];
}

/**
 * Việc cần xử lý. Số "dưới định mức"/"tồn âm" cộng từ cùng ton_theo_nhom với
 * bảng Tồn theo nhóm, và các query này dùng chung cache với khối khác trên trang.
 */
export function AttentionPanel() {
  const overview = useOverviewKpis();
  const groups = useStockByGroup("category", null);
  const negativeToday = useNegativeStockReport(null);

  const sumOf = (key: "belowMinimum" | "negative"): number | null | undefined => {
    if (groups.isPending) return undefined;
    if (groups.isError) return null;
    return groups.data.reduce((total, row) => total + row[key], 0);
  };
  const todayCount = negativeToday.isPending
    ? undefined
    : negativeToday.isError
      ? null
      : negativeToday.data.length;

  return (
    <section className="flex flex-col gap-1 rounded-[18px] bg-nen-phu p-5">
      <QueryState query={overview} skeleton={<Skeleton active paragraph={{ rows: 6 }} />}>
        {(kpis) => {
          const items = buildItems(kpis, sumOf("belowMinimum"), sumOf("negative"), todayCount);
          const open = items.filter((item) => (item.count ?? 0) > 0).length;
          return (
            <>
              <div className="flex items-baseline justify-between pb-2">
                <span className="text-[15px] font-extrabold">Cần xử lý</span>
                <span className="text-[12.5px] text-trung-tinh-350">{open} việc</span>
              </div>
              {items.map((item) => (
                <AttentionRow key={item.key} item={item} />
              ))}
            </>
          );
        }}
      </QueryState>
    </section>
  );
}
