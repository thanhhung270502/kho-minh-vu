import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// Tiền lệ stock-in / stock-out: danh mục tra cứu (kho) chỉ có một nguồn.
import { useLookups } from "@/features/products/hooks/useProducts";

import {
  applyReorderLevels,
  fetchAssignedWarehouseIds,
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
 * Kho được hiện thành cột tồn và thành lựa chọn lọc. Thủ kho chỉ thấy kho mình được
 * phân: RPC tồn không trả số của kho khác, hiện cột đó ra sẽ là cả cột 0 giả — trông
 * như kho kia hết sạch hàng.
 */
export function useVisibleWarehouses(limitToAssigned: boolean) {
  const lookups = useLookups();
  const assigned = useQuery({
    queryKey: inventoryKeys.assignedWarehouses,
    queryFn: fetchAssignedWarehouseIds,
    enabled: limitToAssigned,
  });

  const all = lookups.data?.warehouses ?? [];
  if (!limitToAssigned) return all;
  const assignedIds = new Set(assigned.data ?? []);
  return all.filter((warehouse) => assignedIds.has(warehouse.id));
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
