import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { analyticsKeys } from "../api/analytics.keys";
import { fetchFlowSeries, fetchPeriodRows, fetchWarehouses } from "../api/period.api";
import { readPeriodFilter, writePeriodFilter, type DateRange, type PeriodFilter, type SeriesStep } from "../lib/period";

/** Hôm nay theo giờ máy người dùng (Việt Nam) — mốc cắt kỳ đang chạy. */
export function useToday(): string {
  return useMemo(() => dayjs().format("YYYY-MM-DD"), []);
}

/** Bộ lọc kỳ nằm trên URL: tải lại trang / gửi link vẫn đúng kỳ, đúng hãng. */
export function usePeriodFilterUrl(today: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => readPeriodFilter(new URLSearchParams(searchParams.toString()), today),
    [searchParams, today],
  );
  const setFilter = useCallback(
    (next: PeriodFilter) => {
      const params = writePeriodFilter(next, new URLSearchParams(searchParams.toString()));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  return { filter, setFilter };
}

export function usePeriodRows(range: DateRange, warehouseId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.period(range.from, range.to, warehouseId),
    queryFn: () => fetchPeriodRows(range, warehouseId),
    staleTime: 5 * 60_000,
    // Đổi kỳ / kho không nháy trắng cả tab.
    placeholderData: keepPreviousData,
  });
}

export function useFlowSeries(range: DateRange, step: SeriesStep, warehouseId: string | null, productIds: string[] | null) {
  return useQuery({
    queryKey: analyticsKeys.flow(range.from, range.to, step, warehouseId, productIds),
    queryFn: () => fetchFlowSeries(range, step, warehouseId, productIds),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useWarehouses() {
  return useQuery({ queryKey: analyticsKeys.warehouses, queryFn: fetchWarehouses, staleTime: 30 * 60_000 });
}
