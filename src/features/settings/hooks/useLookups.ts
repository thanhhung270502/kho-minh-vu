import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/features/products/api/product.keys";

import {
  createLookupRow,
  deleteLookupRow,
  fetchLookupRows,
  updateLookupRow,
  type LookupTableName,
  type LookupValues,
} from "../api/lookup.api";

/**
 * Dùng CHUNG tiền tố với `productKeys.lookups` để sửa nhóm hàng / ĐVT / công
 * đoạn ở Cài đặt làm mới luôn ô chọn bên Danh mục hàng — một lần invalidate
 * `["lookups"]` phủ cả hai.
 */
export const lookupKeys = {
  all: productKeys.lookups,
  table: (table: LookupTableName) => [...productKeys.lookups, table] as const,
};

export function useLookupRows(table: LookupTableName) {
  return useQuery({
    queryKey: lookupKeys.table(table),
    queryFn: () => fetchLookupRows(table),
  });
}

function invalidateLookups(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: lookupKeys.all });
}

export function useSaveLookupRow(table: LookupTableName) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string | null; values: LookupValues }) =>
      input.id
        ? updateLookupRow(table, input.id, input.values)
        : createLookupRow(table, input.values),
    onSuccess: () => invalidateLookups(queryClient),
  });
}

export function useDeleteLookupRow(table: LookupTableName) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLookupRow(table, id),
    onSuccess: () => invalidateLookups(queryClient),
  });
}
