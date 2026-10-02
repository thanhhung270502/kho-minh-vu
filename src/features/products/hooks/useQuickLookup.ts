import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "../api/product.keys";
import { createQuickLookup, type QuickLookupTable } from "../api/quick-lookup.api";
import type { QuickLookupValues } from "../schemas/quick-lookup.schema";

export function useCreateQuickLookup(table: QuickLookupTable) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: QuickLookupValues) => createQuickLookup(table, values),
    // ["lookups"] phủ cả ô chọn của form mã hàng lẫn bảng "Danh mục phụ".
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.lookups }),
  });
}
