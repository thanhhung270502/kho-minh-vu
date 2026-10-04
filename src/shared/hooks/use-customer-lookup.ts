"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  customerLookupKeys,
  fetchCustomerBrief,
  searchActiveCustomers,
} from "@/shared/api/customer-lookup.api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

/** Gõ tới đâu tìm tới đó nhưng chỉ bắn RPC khi ngừng gõ ~250ms. Chuỗi rỗng = không tìm. */
export function useCustomerLookup(typed: string) {
  const q = useDebouncedValue(typed.trim(), 250);
  return useQuery({
    queryKey: customerLookupKeys.search(q),
    queryFn: () => searchActiveCustomers(q),
    staleTime: 30_000,
    enabled: q !== "",
    placeholderData: keepPreviousData,
  });
}

export function useCustomerBrief(id: string | undefined) {
  return useQuery({
    queryKey: customerLookupKeys.brief(id ?? ""),
    queryFn: () => fetchCustomerBrief(id ?? ""),
    enabled: Boolean(id),
  });
}
