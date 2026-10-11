"use client";

import {
  ClockCircleOutlined,
  ExportOutlined,
  FileTextOutlined,
  ImportOutlined,
} from "@ant-design/icons";
import { Skeleton, Tooltip } from "antd";
import type { ReactNode } from "react";

import { QueryState } from "@/shared/components/query-state";
import { cn } from "@/shared/utils/cn";

import { useFlowByDay, useOverviewKpis } from "../hooks/useDashboard";
import { averageIssuesLabel, oldestPendingLabel, vsYesterdayLabel } from "../lib/overview-format";
import type { FlowDay } from "../types";
import { Sparkline } from "./sparkline";

type KpiCellProps = {
  label: string;
  icon: ReactNode;
  value: string;
  delta: string;
  trend: number[];
  hint?: string;
  /** Thẻ nổi bật (nền xanh, chữ trắng) — chỉ dùng cho số quan trọng nhất. */
  highlight?: boolean;
};

function KpiCell({ label, icon, value, delta, trend, hint, highlight = false }: KpiCellProps) {
  const deltaPill = (
    <span
      className={cn(
        "self-start rounded-full px-2 py-0.5 text-[14px] font-bold",
        highlight ? "bg-white/20 text-white" : "bg-[#EEF2F7] text-[#3D4A5C]",
      )}
    >
      {delta}
    </span>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-the border px-5 py-[18px]",
        highlight
          ? "border-brand-500 bg-brand-500 text-white shadow-[0_8px_24px_-10px_rgba(0,112,244,.6)]"
          : "border-vien bg-nen-the shadow-the",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[14.5px] font-semibold",
          highlight ? "text-white/80" : "text-[#6B7686]",
        )}
      >
        <span
          className={cn(
            "flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[14px]",
            highlight ? "bg-white/20 text-white" : "bg-brand-50 text-brand-500",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[28px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
          {value}
        </div>
        <Sparkline values={trend} className={highlight ? "text-white" : "text-brand-500"} />
      </div>
      {hint ? <Tooltip title={hint}>{deltaPill}</Tooltip> : deltaPill}
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCell
              highlight
              label="Hóa đơn hôm nay"
              icon={<FileTextOutlined />}
              {...invoices}
              hint={averageIssuesLabel(kpis.avgIssuesPerDay)}
            />
            <KpiCell label="Số lượng xuất hôm nay" icon={<ExportOutlined />} {...issued} />
            <KpiCell label="Phiếu nhập hôm nay" icon={<ImportOutlined />} {...receipts} />
            <KpiCell
              label="Phiếu chờ ghi sổ"
              icon={<ClockCircleOutlined />}
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
