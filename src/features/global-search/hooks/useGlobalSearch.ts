"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { searchEverything } from "../api/global-search.api";
import { globalSearchKeys } from "../api/global-search.keys";

export function useGlobalSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 200);
  const result = useQuery({
    queryKey: globalSearchKeys.query(query),
    queryFn: () => searchEverything(query),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { ...result, debouncedQuery: query };
}
