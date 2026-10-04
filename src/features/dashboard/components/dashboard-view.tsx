"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";

import { PageHeader } from "@/shared/components/page-header";

import { useOverviewKpis, useRefreshDashboard } from "../hooks/useDashboard";
import { formatUpdatedAt } from "../lib/overview-format";
import { AttentionPanel } from "./attention-panel";
import { FlowChartCard } from "./flow-chart-card";
import { IdleProductsCard } from "./idle-products-card";
import { KpiStrip } from "./kpi-strip";
import { NegativeStockSection } from "./negative-stock-section";
import { SalesPaceCard } from "./sales-pace-card";
import { StockByGroupSection } from "./stock-by-group-section";

/**
 * Trang tổng quan 3b (D-01): lưới hai cột `1fr 300px`. Cột trái giữ thứ tự
 * KPI → Nhập – Xuất → Tồn theo nhóm → Nhịp bán → Xuất âm; aside phải là
 * "Cần xử lý" và "Không luân chuyển". Nút "Làm mới" gọi lại tất cả bằng một
 * lần invalidate — không polling, không Realtime (D-14).
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <KpiStrip />
          <FlowChartCard />
          <StockByGroupSection />
          <SalesPaceCard />
          <div id="xuat-am" className="scroll-mt-28">
            <NegativeStockSection />
          </div>
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <AttentionPanel />
          <IdleProductsCard />
        </aside>
      </div>
    </>
  );
}
