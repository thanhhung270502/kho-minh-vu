import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  applyReorderLevels,
  fetchInventory,
  fetchReorderSuggestions,
} from "../api/inventory.api";
import { inventoryKeys } from "../api/inventory.keys";
import type { InventoryFilter } from "../schemas/inventory.schema";
import type { SuggestionBasis } from "../types";

export function useInventory(filter: InventoryFilter) {
  return useQuery({
    queryKey: inventoryKeys.list(filter),
    queryFn: () => fetchInventory(filter),
    // Giữ bảng cũ trong lúc tải trang mới: đổi trang không nháy trắng.
    placeholderData: keepPreviousData,
  });
}

/**
 * `enabled` để màn duyệt chưa mở thì không bắn RPC — đề xuất quét toàn danh mục
 * nên không rẻ (Bẫy 10 áp dụng cho mọi hook đọc có điều kiện).
 */
export function useReorderSuggestions(
  basis: SuggestionBasis | null,
  page: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: inventoryKeys.reorderSuggestions(basis, page),
    queryFn: () => fetchReorderSuggestions(basis, page),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useApplyReorderLevels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => applyReorderLevels(ids),
    onSuccess: () => {
      // Tồn kho + đề xuất (định mức hiện tại vừa đổi).
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      // Định mức nằm trên bảng mã hàng — danh mục và chi tiết mã đang hiển thị nó.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      // Mỗi mã được duyệt sinh một dòng nhật ký sửa của mã hàng.
      void queryClient.invalidateQueries({
        queryKey: ["audit-log", "san_pham"],
      });
    },
  });
}
