"use client";

import { Alert, Segmented } from "antd";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useAnalysisRows, useAnalysisSettings } from "../hooks/useAnalytics";
import { PERIODS, type Period } from "../types";
import { CoverChart } from "./cover-chart";
import { KpiCards } from "./kpi-cards";
import { Rankings } from "./rankings";
import { ReorderTable } from "./reorder-table";
import { SalesPaceChart } from "./sales-pace-chart";
import { SettingsDialog } from "./settings-dialog";

/** Trang Phân tích tồn kho (Phase 13) — số theo mã từ RPC, gom ở lib/analysis. */
export function AnalysisView({ canEditSettings }: { canEditSettings: boolean }) {
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
                    <Alert type="info" showIcon title="Chưa có hóa đơn nào — chưa đủ dữ liệu tính tốc độ bán. Tồn và khách đặt vẫn đúng." />
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
