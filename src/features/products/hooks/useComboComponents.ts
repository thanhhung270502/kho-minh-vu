import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchComboComponents, saveComboComponents } from "../api/combo.api";
import { productKeys } from "../api/product.keys";
import type { ComboComponent } from "../types";

export function useComboComponents(comboId: string) {
  return useQuery({
    queryKey: productKeys.comboComponents(comboId),
    queryFn: () => fetchComboComponents(comboId),
    enabled: comboId !== "",
  });
}

export function useSaveComboComponents(comboId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ReadonlyArray<Pick<ComboComponent, "productId" | "quantity">>) =>
      saveComboComponents(comboId, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.comboComponents(comboId) });
    },
  });
}
