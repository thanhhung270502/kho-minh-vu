"use client";

import { Skeleton, Tooltip } from "antd";

import { QueryState } from "@/shared/components/query-state";

import { useFlowByDay, useOverviewKpis } from "../hooks/useDashboard";
import { averageIssuesLabel, oldestPendingLabel, vsYesterdayLabel } from "../lib/overview-format";
import type { FlowDay } from "../types";
import { Sparkline } from "./sparkline";

type KpiCellProps = {
  label: string;
  value: string;
  delta: string;
  trend: number[];
  hint?: string;
};

function KpiCell({ label, value, delta, trend, hint }: KpiCellProps) {
  const deltaLine = (
    <div className="text-[14px] font-semibold text-trung-tinh-500">{delta}</div>
  );

  return (
    <div className="flex flex-col gap-2.5 border-vien px-5 py-[18px] max-lg:nth-[n+3]:border-t max-lg:even:border-l lg:not-first:border-l">
      <div className="text-[14.5px] font-medium text-chu-phu">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[28px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
          {value}
        </div>
        <Sparkline values={trend} />
      </div>
      {hint ? <Tooltip title={hint}>{deltaLine}</Tooltip> : deltaLine}
    </div>
  );
}

const LAST_DAYS = 30;
const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

/**
 * Bốn số của HÔM NAY: hóa đơn, số lượng xuất, phiếu nhập (so hôm qua, đường xu hướng
 * 30 ngày từ nhap_xuat_theo_ngay — điểm cuối là hôm nay) và phiếu chờ ghi sổ.
 * So sánh theo tuần / tháng / quý nằm ở trang Phân tích.
 */
export function KpiStrip() {
  const overview = useOverviewKpis();
  const flow = useFlowByDay(LAST_DAYS);

  return (
    <QueryState
      query={overview}
      skeleton={<Skeleton active paragraph={{ rows: 2 }} />}
      emptyDescription=""
      isEmpty={() => false}
    >
      {(kpis) => {
        const days = flow.data ?? [];
        const today = days.at(-1);
        const yesterday = days.at(-2);
        const cell = (pick: (d: FlowDay) => number) => ({
          value: today ? n(pick(today)) : "—",
          delta: today && yesterday ? vsYesterdayLabel(pick(today), pick(yesterday)) : "Đang tải…",
          trend: days.map(pick),
        });
        const invoices = cell((d) => d.issueCount);
        const issued = cell((d) => d.issueQuantity);
        const receipts = cell((d) => d.receiptCount);

        return (
          <div className="grid grid-cols-2 overflow-hidden rounded-the border border-vien bg-nen-the lg:grid-cols-4">
            <KpiCell label="Hóa đơn hôm nay" {...invoices} hint={averageIssuesLabel(kpis.avgIssuesPerDay)} />
            <KpiCell label="Số lượng xuất hôm nay" {...issued} />
            <KpiCell label="Phiếu nhập hôm nay" {...receipts} />
            <KpiCell
              label="Phiếu chờ ghi sổ"
              value={n(kpis.pendingDocs)}
              delta={oldestPendingLabel(kpis.oldestPendingDays)}
              trend={kpis.pendingTrend}
            />
          </div>
        );
      }}
    </QueryState>
  );
}
