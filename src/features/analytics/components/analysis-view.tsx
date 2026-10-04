"use client";

import { Alert, Divider, Tabs, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useAnalysisRows, useAnalysisSettings } from "../hooks/useAnalytics";
import { usePeriodFilterUrl, usePeriodRows, useToday } from "../hooks/usePeriodAnalysis";
import { periodRange } from "../lib/period";
import { matchesPeriodFilter } from "../lib/period-analysis";
import { CoverChart } from "./cover-chart";
import { KpiCards } from "./kpi-cards";
import { PeriodFilterBar } from "./period-filter-bar";
import { PeriodSection } from "./period-section";
import { Rankings } from "./rankings";
import { ReorderTable } from "./reorder-table";
import { SettingsDialog } from "./settings-dialog";

type Props = {
  canEditSettings: boolean;
  /**
   * Tab "Duyệt định mức" (PTICH-07) — route ghép sẵn từ feature inventory, KHÔNG
   * import feature đó ở đây. null khi vai trò không duyệt được định mức.
   */
  reorderSection: ReactNode | null;
};

/** Trang Phân tích tồn kho. Tab nằm trên URL `?tab=dinh-muc` để link cũ mở đúng tab. */
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

/** Nhịp bán dùng cho phần "Hiện tại" (cần nhập, số ngày còn hàng) — cùng số danh mục hàng hóa. */
const CURRENT_PACE_DAYS = 30;

/**
 * Tab Phân tích: thanh lọc (kỳ tuần/tháng/quý/năm + kho + quy chuẩn mã) →
 * "Trong kỳ" (sổ cái theo kỳ) → "Hiện tại" (tồn, cần nhập theo nhịp bán 30 ngày).
 */
function AnalysisOverview({ canEditSettings }: { canEditSettings: boolean }) {
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
  const idSet = useMemo(() => (productIds ? new Set(productIds) : null), [productIds]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PeriodFilterBar filter={filter} today={today} rows={periodRows.data ?? []} onChange={setFilter} />
        {canEditSettings && settings.data ? <SettingsDialog settings={settings.data} /> : null}
      </div>

      <QueryState query={periodRows} isEmpty={(r) => r.length === 0} emptyDescription="Chưa có mã hàng nào để phân tích.">
        {() => <PeriodSection filter={filter} range={range} rows={rows} productIds={productIds} />}
      </QueryState>

      <Divider className="my-2" />
      <Typography.Title level={5} className="m-0">
        Hiện tại{" "}
        <span className="text-sm font-normal text-chu-phu">
          (tồn hiện tại mọi kho, nhịp bán {CURRENT_PACE_DAYS} ngày gần nhất — cùng số cột Cần đặt ở Danh sách hàng hóa)
        </span>
      </Typography.Title>
      <QueryState query={settings} isEmpty={() => false} emptyDescription="">
        {(loadedSettings) => (
          <QueryState query={currentRows} isEmpty={(r) => r.length === 0} emptyDescription="Chưa có mã hàng nào để phân tích.">
            {(loaded) => {
              const picked = idSet ? loaded.filter((r) => idSet.has(r.productId)) : loaded;
              const days = loaded[0]?.effectiveDays ?? 0;
              return (
                <>
                  {days === 0 ? (
                    <Alert type="info" showIcon title="Chưa có hóa đơn nào trong 30 ngày gần nhất — chưa tính được tốc độ bán. Tồn và đơn đặt vẫn đúng." />
                  ) : null}
                  <KpiCards rows={picked} settings={loadedSettings} />
                  <CoverChart rows={picked} settings={loadedSettings} />
                  <ReorderTable rows={picked} settings={loadedSettings} />
                  <Rankings rows={picked} />
                </>
              );
            }}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}
