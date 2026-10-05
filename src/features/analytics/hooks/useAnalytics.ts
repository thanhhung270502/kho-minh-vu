import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchAnalysisRows,
  fetchAnalysisSettings,
} from "../api/analytics.api";
import { analyticsKeys } from "../api/analytics.keys";
import type { Period } from "../types";

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

export function useAnalysisSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: analyticsKeys.settings,
    queryFn: fetchAnalysisSettings,
    enabled: options?.enabled ?? true,
  });
}
