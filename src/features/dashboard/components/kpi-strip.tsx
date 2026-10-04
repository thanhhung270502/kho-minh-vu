"use client";

import { Skeleton, Tooltip } from "antd";

import { QueryState } from "@/shared/components/query-state";

import { useFlowByDay, useOverviewKpis, useSalesPace } from "../hooks/useDashboard";
import {
  averageIssuesLabel,
  buildInventoryKpi,
  newProductsLabel,
  oldestPendingLabel,
} from "../lib/overview-format";
import { Sparkline } from "./sparkline";

type KpiCellProps = {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  trend: number[];
  hint?: string;
};

function KpiCell({ label, value, unit, delta, trend, hint }: KpiCellProps) {
  const deltaLine = (
    <div className="text-[12px] font-semibold text-trung-tinh-500">{delta}</div>
  );

  return (
    <div className="flex flex-col gap-2.5 border-vien px-5 py-[18px] max-lg:nth-[n+3]:border-t max-lg:even:border-l lg:not-first:border-l">
      <div className="text-[12.5px] font-medium text-chu-phu">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[28px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
          {value}
          {unit ? (
            <span className="ml-[3px] text-[14px] tracking-normal text-trung-tinh-300">{unit}</span>
          ) : null}
        </div>
        <Sparkline values={trend} />
      </div>
      {hint ? <Tooltip title={hint}>{deltaLine}</Tooltip> : deltaLine}
    </div>
  );
}

function todayIsoVietnam(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function KpiStrip() {
  const overview = useOverviewKpis();
  const pace = useSalesPace();
  const flow = useFlowByDay(30);

  return (
    <QueryState
      query={overview}
      skeleton={<Skeleton active paragraph={{ rows: 2 }} />}
      emptyDescription=""
      isEmpty={() => false}
    >
      {(kpis) => {
        const inventory = buildInventoryKpi(kpis, todayIsoVietnam());
        // Cùng nguồn nhip_ban với thẻ Nhịp bán (D-01); sparkline từ nhap_xuat_theo_ngay
        // dùng cùng định nghĩa đếm nên điểm cuối trùng số trên ô.
        const issuesToday = pace.data ? pace.data.today.documentCount.toLocaleString("vi-VN") : "—";

        return (
          <div className="grid grid-cols-2 overflow-hidden rounded-the border border-vien bg-nen-the lg:grid-cols-4">
            <KpiCell
              label={inventory.label}
              value={inventory.value}
              unit={inventory.unit}
              delta={inventory.delta}
              trend={kpis.inventoryTrend}
              hint="Ước tính: tồn tháng trước dựng lùi từ sổ kho × giá vốn hiện tại"
            />
            <KpiCell
              label="Mã đang kinh doanh"
              value={kpis.activeProducts.toLocaleString("vi-VN")}
              delta={newProductsLabel(kpis.newProductsThisMonth)}
              trend={kpis.activeProductsTrend}
            />
            <KpiCell
              label="Phiếu xuất hôm nay"
              value={issuesToday}
              delta={averageIssuesLabel(kpis.avgIssuesPerDay)}
              trend={flow.data?.map((day) => day.issueCount) ?? []}
            />
            <KpiCell
              label="Phiếu chờ ghi sổ"
              value={kpis.pendingDocs.toLocaleString("vi-VN")}
              delta={oldestPendingLabel(kpis.oldestPendingDays)}
              trend={kpis.pendingTrend}
            />
          </div>
        );
      }}
    </QueryState>
  );
}
