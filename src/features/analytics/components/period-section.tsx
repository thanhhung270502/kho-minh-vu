"use client";

import { Alert, Skeleton } from "antd";

import { useFlowSeries } from "../hooks/usePeriodAnalysis";
import { suggestedOrder } from "../lib/analysis";
import { periodKpis } from "../lib/period-analysis";
import { periodLabel, seriesStep, type DateRange, type PeriodFilter } from "../lib/period";
import type { AnalysisRow, AnalysisSettings, PeriodRow } from "../types";
import { BreakdownChart } from "./breakdown-chart";
import { PeriodKpiCards } from "./period-kpis";
import { PeriodRankings } from "./period-rankings";
import { PeriodTable } from "./period-table";
import { ReorderTable } from "./reorder-table";
import { TrendChart } from "./trend-chart";

type Props = {
  filter: PeriodFilter;
  range: DateRange;
  /** Đã lọc theo hãng / dòng / linh kiện / xử lý / nhóm. */
  rows: PeriodRow[];
  /** null = không lọc theo mã (biểu đồ tính mọi mã). */
  productIds: string[] | null;
  /** Tồn + nhịp bán 30 ngày tại hôm nay (đã lọc cùng bộ lọc) — cho phần cần nhập. */
  current: AnalysisRow[];
  settings: AnalysisSettings;
};

const dayCount = (r: DateRange) => Math.round((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000) + 1;

/** Bố cục tab Phân tích: 4 KPI → 2 biểu đồ → 4 bảng xếp hạng → bảng XNT → danh sách cần nhập. */
export function PeriodSection({ filter, range, rows, productIds, current, settings }: Props) {
  const step = seriesStep(filter.unit);
  const series = useFlowSeries(range, step, filter.warehouseId, productIds);
  const label = periodLabel(filter.unit, filter.anchor);
  const points = series.data ?? [];
  const kpis = periodKpis(rows, points);
  const reorder = current.reduce(
    (acc, r) => {
      const qty = suggestedOrder(r, settings.coverDays);
      return qty > 0 ? { products: acc.products + 1, quantity: acc.quantity + qty } : acc;
    },
    { products: 0, quantity: 0 },
  );

  return (
    <div className="flex flex-col gap-3">
      {productIds !== null && productIds.length === 0 ? (
        <Alert type="info" showIcon title="Không có mã nào khớp bộ lọc. Bỏ bớt điều kiện lọc để xem số liệu." />
      ) : null}
      {series.isError ? (
        <Alert type="error" showIcon title="Không tải được số liệu nhập – xuất theo thời gian." description="Bấm sang kỳ khác rồi quay lại, hoặc tải lại trang." />
      ) : null}

      {series.isPending ? <Skeleton active paragraph={{ rows: 3 }} /> : <PeriodKpiCards kpis={kpis} reorder={reorder} />}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <BreakdownChart rows={rows} />
        </div>
        <div className="xl:col-span-3">
          {series.isPending ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <TrendChart points={points} step={step} previous={{ sold: kpis.soldPrev, received: kpis.receivedPrev }} />
          )}
        </div>
      </div>

      <PeriodRankings rows={rows} days={dayCount(range)} />

      <PeriodTable rows={rows} periodText={label} days={dayCount(range)} settings={settings} />
      <ReorderTable rows={current} settings={settings} />
    </div>
  );
}
