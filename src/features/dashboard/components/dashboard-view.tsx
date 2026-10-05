"use client";

import { LineChartOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";

import { PageHeader } from "@/shared/components/page-header";

import { useOverviewKpis, useRefreshDashboard } from "../hooks/useDashboard";
import { formatUpdatedAt } from "../lib/overview-format";
import { AttentionPanel } from "./attention-panel";
import { KpiStrip } from "./kpi-strip";
import { NegativeStockSection } from "./negative-stock-section";
import { StockByGroupSection } from "./stock-by-group-section";

/**
 * Tổng quan = việc của HÔM NAY: số trong ngày so hôm qua, tồn theo nhóm, xuất âm,
 * và cột "Cần xử lý". Phân tích theo tuần / tháng / quý / năm (biểu đồ, xếp hạng,
 * tồn chậm) nằm ở trang Phân tích — không lặp lại ở đây. Nút "Làm mới" gọi lại
 * cả trang bằng một lần invalidate — không polling, không Realtime (D-14).
 */
export function DashboardView({ canViewAnalysis }: { canViewAnalysis: boolean }) {
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
          <div className="flex gap-2">
            {canViewAnalysis ? (
              <Link href="/phan-tich">
                <Button icon={<LineChartOutlined />}>Phân tích tháng này</Button>
              </Link>
            ) : null}
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()} loading={isRefreshing}>
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <KpiStrip />
          <div id="xuat-am" className="scroll-mt-28">
            <NegativeStockSection />
          </div>
          <StockByGroupSection />
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <AttentionPanel canViewAnalysis={canViewAnalysis} />
        </aside>
      </div>
    </>
  );
}
