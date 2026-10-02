import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAnalysisRow,
  fetchAnalysisRows,
  fetchAnalysisSettings,
  fetchSalesDays,
  saveAnalysisSettings,
} from "../api/analytics.api";
import { analyticsKeys } from "../api/analytics.keys";
import type { AnalysisSettings, Period } from "../types";

export function useAnalysisRows(period: Period) {
  return useQuery({
    queryKey: analyticsKeys.rows(period),
    queryFn: () => fetchAnalysisRows(period),
    // Đổi kỳ không nháy trắng cả trang.
    placeholderData: keepPreviousData,
  });
}

export function useAnalysisRow(period: Period, productId: string) {
  return useQuery({
    queryKey: analyticsKeys.row(period, productId),
    queryFn: () => fetchAnalysisRow(period, productId),
    enabled: productId !== "",
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
