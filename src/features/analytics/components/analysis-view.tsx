"use client";

import { useMemo } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useAnalysisRows, useAnalysisSettings } from "../hooks/useAnalytics";
import { usePeriodFilterUrl, usePeriodRows, useToday } from "../hooks/usePeriodAnalysis";
import { periodRange } from "../lib/period";
import { matchesPeriodFilter } from "../lib/period-analysis";
import { PeriodFilterBar } from "./period-filter-bar";
import { PeriodSection } from "./period-section";
import { SettingsDialog } from "./settings-dialog";

/** Nhịp bán dùng cho phần cần nhập — cùng số cột Cần đặt ở Danh sách hàng hóa. */
const CURRENT_PACE_DAYS = 30;

/**
 * Tab Phân tích (một màn, không còn tab Duyệt định mức): thanh lọc kỳ tuần/tháng/
 * quý/năm + kho + quy chuẩn mã → KPI → biểu đồ → bảng XNT → danh sách cần nhập.
 */
export function AnalysisView({ canEditSettings }: { canEditSettings: boolean }) {
  const today = useToday();
  const { filter, setFilter } = usePeriodFilterUrl(today);
  const range = useMemo(() => periodRange(filter.unit, filter.anchor, today), [filter.unit, filter.anchor, today]);
  const periodRows = usePeriodRows(range, filter.warehouseId);
  const currentRows = useAnalysisRows(CURRENT_PACE_DAYS);
  const settings = useAnalysisSettings();

  // Lọc theo mã (hãng/dòng/linh kiện/xử lý/nhóm). Kho đã lọc ở RPC.
  const attributeFiltered = Boolean(
    filter.brandCode || filter.modelCode || filter.partCode || filter.stageId || filter.categoryId,
  );
  const rows = useMemo(
    () => (periodRows.data ?? []).filter((r) => matchesPeriodFilter(r, filter)),
    [periodRows.data, filter],
  );
  const productIds = useMemo(
    () => (attributeFiltered ? rows.map((r) => r.productId) : null),
    [attributeFiltered, rows],
  );
  const current = useMemo(() => {
    const ids = productIds ? new Set(productIds) : null;
    const all = currentRows.data ?? [];
    return ids ? all.filter((r) => ids.has(r.productId)) : all;
  }, [currentRows.data, productIds]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PeriodFilterBar filter={filter} today={today} rows={periodRows.data ?? []} onChange={setFilter} />
        {canEditSettings && settings.data ? <SettingsDialog settings={settings.data} /> : null}
      </div>

      <QueryState query={settings} isEmpty={() => false} emptyDescription="">
        {(loadedSettings) => (
          <QueryState query={periodRows} isEmpty={(r) => r.length === 0} emptyDescription="Chưa có mã hàng nào để phân tích.">
            {() => (
              <QueryState query={currentRows} isEmpty={() => false} emptyDescription="">
                {() => (
                  <PeriodSection
                    filter={filter}
                    range={range}
                    rows={rows}
                    productIds={productIds}
                    current={current}
                    settings={loadedSettings}
                  />
                )}
              </QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}
