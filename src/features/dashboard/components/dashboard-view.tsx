"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";

import { PageHeader } from "@/shared/components/page-header";

import { useRefreshDashboard } from "../hooks/useDashboard";
import { NegativeStockSection } from "./negative-stock-section";
import { SalesPaceCard } from "./sales-pace-card";
import { StockByGroupSection } from "./stock-by-group-section";

/**
 * Trang tổng quan (chỉ quản lý, D-11): ghép ba khối theo đúng thứ tự D-13
 * (Nhịp bán → Xuất âm → Tồn theo nhóm/công đoạn) + nút "Làm mới" gọi lại cả
 * ba. Không polling, không Realtime (D-14) — trang tự tải khi mở qua
 * TanStack Query mặc định, "Làm mới" chỉ invalidate một lần khi bấm.
 */
export function DashboardView() {
  const { refresh, isRefreshing } = useRefreshDashboard();

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Tình hình kho trong ngày"
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()} loading={isRefreshing}>
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <SalesPaceCard />
        <NegativeStockSection />
        <StockByGroupSection />
      </div>
    </>
  );
}
