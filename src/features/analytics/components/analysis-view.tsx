"use client";

import { Alert, Segmented, Tabs } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useAnalysisRows, useAnalysisSettings } from "../hooks/useAnalytics";
import { PERIODS, type Period } from "../types";
import { CoverChart } from "./cover-chart";
import { KpiCards } from "./kpi-cards";
import { Rankings } from "./rankings";
import { ReorderTable } from "./reorder-table";
import { SalesPaceChart } from "./sales-pace-chart";
import { SettingsDialog } from "./settings-dialog";

type Props = {
  canEditSettings: boolean;
  /**
   * Tab "Duyệt định mức" (PTICH-07) — route ghép sẵn từ feature inventory, KHÔNG
   * import feature đó ở đây. null khi vai trò không duyệt được định mức.
   */
  reorderSection: ReactNode | null;
};

/** Trang Phân tích tồn kho (Phase 13). Tab nằm trên URL `?tab=dinh-muc` để link cũ mở đúng tab. */
export function AnalysisView({ canEditSettings, reorderSection }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = reorderSection && searchParams.get("tab") === "dinh-muc" ? "dinh-muc" : "phan-tich";

  const overview = <AnalysisOverview canEditSettings={canEditSettings} />;
  if (!reorderSection) return overview;

  return (
    <Tabs
      activeKey={tab}
      onChange={(key) => router.replace(key === "dinh-muc" ? `${pathname}?tab=dinh-muc` : pathname)}
      items={[
        { key: "phan-tich", label: "Phân tích", children: overview },
        { key: "dinh-muc", label: "Duyệt định mức", children: reorderSection },
      ]}
    />
  );
}

function AnalysisOverview({ canEditSettings }: { canEditSettings: boolean }) {
  const [period, setPeriod] = useState<Period>(30);
  const rows = useAnalysisRows(period);
  const settings = useAnalysisSettings();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-chu-phu">Kỳ tính bán TB:</span>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: `${p} ngày` }))}
        />
        {canEditSettings && settings.data ? <SettingsDialog settings={settings.data} /> : null}
      </div>

      <QueryState query={settings} isEmpty={() => false} emptyDescription="">
        {(loadedSettings) => (
          <QueryState
            query={rows}
            isEmpty={(r) => r.length === 0}
            emptyDescription="Chưa có mã hàng nào để phân tích."
          >
            {(loadedRows) => {
              const days = loadedRows[0]?.effectiveDays ?? 0;
              return (
                <>
                  {days === 0 ? (
                    <Alert type="info" showIcon title="Chưa có hóa đơn nào — chưa đủ dữ liệu tính tốc độ bán. Tồn và đơn đặt vẫn đúng." />
                  ) : days < period ? (
                    <Alert type="info" showIcon title={`Hệ mới có ${days} ngày dữ liệu — bán TB/ngày tính theo ${days} ngày thay vì ${period}.`} />
                  ) : null}
                  <KpiCards rows={loadedRows} settings={loadedSettings} />
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <CoverChart rows={loadedRows} settings={loadedSettings} />
                    <SalesPaceChart period={period} />
                  </div>
                  <ReorderTable rows={loadedRows} settings={loadedSettings} />
                  <Rankings rows={loadedRows} />
                </>
              );
            }}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}
