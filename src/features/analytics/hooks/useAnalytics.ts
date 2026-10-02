import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAnalysisRows,
  fetchAnalysisSettings,
  fetchSalesDays,
  saveAnalysisSettings,
} from "../api/analytics.api";
import { analyticsKeys } from "../api/analytics.keys";
import type { AnalysisSettings, Period } from "../types";

export function useAnalysisRows(period: Period, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: analyticsKeys.rows(period),
    queryFn: () => fetchAnalysisRows(period),
    enabled: options?.enabled ?? true,
    // Danh mục dùng chung cache này cho hai cột dự báo — không tải lại mỗi lần đổi trang.
    staleTime: 5 * 60_000,
    // Đổi kỳ không nháy trắng cả trang.
    placeholderData: keepPreviousData,
  });
}

export function useSalesDays(period: Period) {
  return useQuery({
    queryKey: analyticsKeys.salesDays(period),
    queryFn: () => fetchSalesDays(period),
    placeholderData: keepPreviousData,
  });
}

export function useAnalysisSettings() {
  return useQuery({ queryKey: analyticsKeys.settings, queryFn: fetchAnalysisSettings });
}

export function useSaveAnalysisSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AnalysisSettings) => saveAnalysisSettings(settings),
    // Ngưỡng chỉ đổi màu/nhóm ở client — không phải tải lại dữ liệu phân tích.
    onSuccess: (_, settings) => queryClient.setQueryData(analyticsKeys.settings, settings),
  });
}
