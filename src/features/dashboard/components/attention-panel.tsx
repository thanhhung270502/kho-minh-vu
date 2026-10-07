"use client";

import { Skeleton } from "antd";
import Link from "next/link";
import { useMemo } from "react";

import { useAnalysisRows, useAnalysisSettings } from "@/features/analytics/hooks/useAnalytics";
import { suggestedOrder } from "@/features/analytics/lib/analysis";
import { QueryState } from "@/shared/components/query-state";

import { useNegativeStockReport, useOverviewKpis, useStockByGroup } from "../hooks/useDashboard";
import { negativeByWarehouseLabel, pendingBreakdownLabel } from "../lib/overview-format";
import type { OverviewKpis } from "../types";

/** Cùng nhịp bán với Danh sách cần nhập ở trang Phân tích. */
const REORDER_PACE_DAYS = 30;

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
        <div className="flex items-center gap-1.5 text-[14.5px] font-bold">
          <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} />
          {item.title}
        </div>
        <div className="text-[13.5px] text-chu-phu">{empty ? "Không có" : item.description}</div>
        {empty ? null : (
          <Link
            href={item.href}
            className="mt-1 self-start rounded-full bg-nen-the px-2.5 py-[5px] text-[13.5px] font-bold text-chu-chinh shadow-[0_0_0_1px_#E5E5E5]"
          >
            {item.cta} →
          </Link>
        )}
      </div>
    </div>
  );
}

type Counts = {
  reorder: { count: number | null | undefined; description: string } | null;
  negative: number | null | undefined;
  negativeToday: number | null | undefined;
};

function buildItems(kpis: OverviewKpis, counts: Counts): Item[] {
  const items: Item[] = [];
  if (counts.reorder) {
    items.push({
      key: "reorder",
      title: "Cần nhập hàng",
      count: counts.reorder.count,
      description: counts.reorder.description,
      dot: "bg-canh-bao",
      cta: "Xem danh sách",
      href: "/phan-tich#can-nhap",
    });
  }
  items.push(
    {
      key: "negative",
      title: "Mã tồn âm",
      count: counts.negative,
      description: negativeByWarehouseLabel(kpis.negativeByWarehouse),
      dot: "bg-nguy-hiem",
      cta: "Kiểm kê",
      href: "/kiem-ke",
    },
    {
      key: "negative-today",
      title: "Phiếu xuất âm hôm nay",
      count: counts.negativeToday,
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
          ? "/nhap-hang?trang_thai=NHAP_LIEU"
          : "/duyet-don?trang_thai=NHAP_LIEU",
    },
  );
  return items;
}

/** undefined = đang tải, null = lỗi — cùng quy ước với cột số của AttentionRow. */
function stateOf<T>(query: { isPending: boolean; isError: boolean; data?: T }, pick: (data: T) => number) {
  if (query.isPending) return undefined;
  if (query.isError || query.data === undefined) return null;
  return pick(query.data);
}

/**
 * Việc cần xử lý hôm nay. "Cần nhập hàng" cùng con số với thẻ "Mã cần nhập" của
 * trang Phân tích (đề nghị nhập > 0, nhịp bán 30 ngày) — chỉ hiện với người được xem Phân tích.
 */
export function AttentionPanel({ canViewAnalysis }: { canViewAnalysis: boolean }) {
  const overview = useOverviewKpis();
  const groups = useStockByGroup("category", null);
  const negativeToday = useNegativeStockReport(null);
  const analysisRows = useAnalysisRows(REORDER_PACE_DAYS, { enabled: canViewAnalysis });
  const settings = useAnalysisSettings({ enabled: canViewAnalysis });

  const reorder = useMemo(() => {
    if (!canViewAnalysis) return null;
    if (analysisRows.isPending || settings.isPending) return { count: undefined, description: "" };
    if (!analysisRows.data || !settings.data) return { count: null, description: LOAD_FAILED_HINT };
    const coverDays = settings.data.coverDays;
    let count = 0;
    let quantity = 0;
    let outOfStock = 0;
    for (const row of analysisRows.data) {
      const qty = suggestedOrder(row, coverDays);
      if (qty <= 0) continue;
      count += 1;
      quantity += qty;
      if (row.stock <= 0) outOfStock += 1;
    }
    const n = (v: number) => v.toLocaleString("vi-VN");
    return {
      count,
      description: `Tổng ${n(quantity)} cần nhập cho ${coverDays} ngày bán · ${n(outOfStock)} mã đã hết`,
    };
  }, [canViewAnalysis, analysisRows.isPending, analysisRows.data, settings.isPending, settings.data]);

  return (
    <section className="flex flex-col gap-1 rounded-[18px] border border-vien bg-nen-the p-5">
      <QueryState query={overview} skeleton={<Skeleton active paragraph={{ rows: 6 }} />}>
        {(kpis) => {
          const items = buildItems(kpis, {
            reorder,
            negative: stateOf(groups, (rows) => rows.reduce((total, row) => total + row.negative, 0)),
            negativeToday: stateOf(negativeToday, (lines) => lines.length),
          });
          const open = items.filter((item) => (item.count ?? 0) > 0).length;
          return (
            <>
              <div className="flex items-baseline justify-between pb-2">
                <span className="text-[15px] font-extrabold">Cần xử lý</span>
                <span className="text-[13.5px] text-trung-tinh-350">{open} việc</span>
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
