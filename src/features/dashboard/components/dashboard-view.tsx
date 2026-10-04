"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";

import { PageHeader } from "@/shared/components/page-header";

import { useOverviewKpis, useRefreshDashboard } from "../hooks/useDashboard";
import { formatUpdatedAt } from "../lib/overview-format";
import { FlowChartCard } from "./flow-chart-card";
import { KpiStrip } from "./kpi-strip";
import { NegativeStockSection } from "./negative-stock-section";
import { SalesPaceCard } from "./sales-pace-card";
import { StockByGroupSection } from "./stock-by-group-section";

/**
 * Trang tổng quan (D-01): widget 3b mới đứng trên (hàng KPI → biểu đồ
 * Nhập – Xuất), các khối cũ giữ nguyên bên dưới (Tồn theo nhóm → Nhịp bán →
 * Xuất âm). Nút "Làm mới" gọi lại tất cả bằng một lần invalidate — không
 * polling, không Realtime (D-14).
 */
export function DashboardView() {
  const { refresh, isRefreshing } = useRefreshDashboard();
  const overview = useOverviewKpis();

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={
          overview.dataUpdatedAt
            ? formatUpdatedAt(overview.dataUpdatedAt)
            : "Tình hình kho trong ngày"
        }
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()} loading={isRefreshing}>
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <KpiStrip />
        <FlowChartCard />
        <StockByGroupSection />
        <SalesPaceCard />
        {/* Neo cho CTA "Xem phiếu" ở 20-14 */}
        <div id="xuat-am" className="scroll-mt-28">
          <NegativeStockSection />
        </div>
      </div>
    </>
  );
}
