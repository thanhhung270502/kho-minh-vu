"use client";

import { Alert, Typography } from "antd";

import { QueryState } from "@/shared/components/query-state";

import { useFlowSeries } from "../hooks/usePeriodAnalysis";
import { periodKpis } from "../lib/period-analysis";
import { periodLabel, seriesStep, type DateRange, type PeriodFilter } from "../lib/period";
import type { PeriodRow } from "../types";
import { BreakdownChart } from "./breakdown-chart";
import { FlowChart } from "./flow-chart";
import { PeriodKpiCards } from "./period-kpis";
import { PeriodTable } from "./period-table";

type Props = {
  filter: PeriodFilter;
  range: DateRange;
  /** Đã lọc theo hãng / dòng / linh kiện / xử lý / nhóm. */
  rows: PeriodRow[];
  /** null = không lọc theo mã (biểu đồ tính mọi mã). */
  productIds: string[] | null;
};

const fmt = (d: string) => d.split("-").reverse().join("/");

/** Phần "Trong kỳ": KPI so kỳ trước, biểu đồ nhập – xuất, cơ cấu bán, bảng XNT. */
export function PeriodSection({ filter, range, rows, productIds }: Props) {
  const step = seriesStep(filter.unit);
  const series = useFlowSeries(range, step, filter.warehouseId, productIds);
  const label = periodLabel(filter.unit, filter.anchor);

  return (
    <section className="flex flex-col gap-3">
      <Typography.Title level={5} className="m-0">
        Trong kỳ — {label}{" "}
        <span className="text-sm font-normal text-chu-phu">
          ({fmt(range.from)} – {fmt(range.to)})
        </span>
      </Typography.Title>
      {productIds !== null && productIds.length === 0 ? (
        <Alert type="info" showIcon title="Không có mã nào khớp bộ lọc. Bỏ bớt điều kiện lọc để xem số liệu." />
      ) : null}
      <QueryState query={series} isEmpty={() => false} emptyDescription="">
        {(points) => (
          <>
            <PeriodKpiCards kpis={periodKpis(rows, points)} />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <FlowChart points={points} step={step} />
              <BreakdownChart rows={rows} />
            </div>
          </>
        )}
      </QueryState>
      <PeriodTable rows={rows} periodText={label} />
    </section>
  );
}
