import {
  keepPreviousData,
  useIsFetching,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchFlowByDay,
  fetchIdleProducts,
  fetchNegativeStockReport,
  fetchOverviewKpis,
  type FlowRange,
  fetchSalesPace,
  fetchStockByGroup,
} from "../api/dashboard.api";
import { dashboardKeys } from "../api/dashboard.keys";
import type { StockGroupBy } from "../lib/stock-drilldown";

export function useOverviewKpis() {
  return useQuery({ queryKey: dashboardKeys.overview(), queryFn: fetchOverviewKpis });
}

export function useFlowByDay(days: FlowRange) {
  return useQuery({
    queryKey: dashboardKeys.flow(days),
    queryFn: () => fetchFlowByDay(days),
    placeholderData: keepPreviousData,
  });
}

export function useIdleProducts() {
  return useQuery({ queryKey: dashboardKeys.idleProducts(), queryFn: fetchIdleProducts });
}

export function useSalesPace() {
  return useQuery({
    queryKey: dashboardKeys.salesPace(),
    queryFn: fetchSalesPace,
  });
}

/** `placeholderData` giữ bảng cũ khi đổi ngày — không nháy trắng. */
export function useNegativeStockReport(date: string | null) {
  return useQuery({
    queryKey: dashboardKeys.negativeStock(date),
    queryFn: () => fetchNegativeStockReport(date),
    placeholderData: keepPreviousData,
  });
}

/** `placeholderData` giữ bảng cũ khi đổi tab/kho — không nháy trắng. */
export function useStockByGroup(
  groupBy: StockGroupBy,
  warehouseId: string | null,
) {
  return useQuery({
    queryKey: dashboardKeys.stockByGroup(groupBy, warehouseId),
    queryFn: () => fetchStockByGroup(groupBy, warehouseId),
    placeholderData: keepPreviousData,
  });
}

/**
 * D-14: nút "Làm mới" gọi lại cả ba khối bằng một lần invalidate — không
 * polling, không Realtime. Trang tự tải khi mở (TanStack Query mặc định).
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  const isRefreshing =
    useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  return {
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    isRefreshing,
  };
}
