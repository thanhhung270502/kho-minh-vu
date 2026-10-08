import {
  keepPreviousData,
  useInfiniteQuery,
  useIsFetching,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ACTIVITY_PAGE_SIZE,
  fetchActivity,
  fetchFlowByDay,
  fetchNegativeStockReport,
  fetchOverviewKpis,
  fetchStockByGroup,
} from "../api/dashboard.api";
import { dashboardKeys } from "../api/dashboard.keys";
import { activityCutoff } from "../lib/activity-format";
import type { StockGroupBy } from "../lib/stock-drilldown";
import type { ActivityGroup } from "../types";

export function useOverviewKpis() {
  return useQuery({ queryKey: dashboardKeys.overview(), queryFn: fetchOverviewKpis });
}

export function useFlowByDay(days: number) {
  return useQuery({
    queryKey: dashboardKeys.flow(days),
    queryFn: () => fetchFlowByDay(days),
    placeholderData: keepPreviousData,
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

/**
 * Hoạt động gần đây — trang theo mốc thời gian (dòng cuối trang trước). Không tự
 * cập nhật: nằm dưới dashboardKeys.all nên nút "Làm mới" tải lại cùng cả trang (D-14).
 */
export function useActivityFeed(group: ActivityGroup) {
  return useInfiniteQuery({
    queryKey: dashboardKeys.activity(group),
    // Chỉ hôm nay + hôm qua: danh sách xếp mới → cũ nên cắt ở mốc là đủ; trang bị cắt
    // ngắn hơn cỡ trang thì getNextPageParam tự dừng "Xem thêm".
    queryFn: async ({ pageParam }) => {
      const cutoff = activityCutoff().getTime();
      return (await fetchActivity(group, pageParam)).filter((e) => new Date(e.at).getTime() >= cutoff);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < ACTIVITY_PAGE_SIZE ? undefined : (last.at(-1)?.at ?? undefined)),
    placeholderData: keepPreviousData,
  });
}
