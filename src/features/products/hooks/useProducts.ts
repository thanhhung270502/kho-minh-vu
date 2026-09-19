import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  applyStageSuggestions,
  bulkAssign,
  confirmReviewed,
  createProduct,
  fetchLookups,
  fetchProductDetail,
  fetchProducts,
  fetchStageSuggestions,
  fetchStockByWarehouse,
  fetchStockCard,
  updateProduct,
  type BulkChange,
  type BulkChangeSource,
} from "../api/product.api";
import { productKeys } from "../api/product.keys";
import type { ProductFilter } from "../schemas/filter.schema";
import type { ProductInput } from "../types";

export function useProducts(filter: ProductFilter) {
  return useQuery({
    queryKey: productKeys.list(filter),
    queryFn: () => fetchProducts(filter),
    // Giữ bảng cũ trong lúc tải page mới: đổi page không nháy trắng.
    placeholderData: keepPreviousData,
  });
}

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductDetail(id),
    // Ngăn kéo "Thêm mã hàng" truyền id rỗng — không chặn ở đây thì mỗi lần mở
    // page danh mục bắn một RPC uuid rỗng và nhận 400 (UAT Phase 2).
    enabled: id !== "",
  });
}

export function useStockCard(
  productId: string,
  warehouseId: string | null,
  page: number,
) {
  return useQuery({
    queryKey: productKeys.stockCard(productId, warehouseId, page),
    queryFn: () => fetchStockCard(productId, warehouseId, page),
    placeholderData: keepPreviousData,
  });
}

export function useStockByWarehouse(productId: string) {
  return useQuery({
    queryKey: productKeys.stockByWarehouse(productId),
    queryFn: () => fetchStockByWarehouse(productId),
  });
}

export function useLookups() {
  return useQuery({
    queryKey: productKeys.lookups,
    queryFn: fetchLookups,
    // Nhóm hàng / ĐVT / công đoạn đổi vài lần một tháng, không cần hỏi lại liên tục.
    staleTime: 5 * 60_000,
  });
}

export function useStageSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: productKeys.stageSuggestions,
    queryFn: fetchStageSuggestions,
    enabled,
  });
}

/** Mọi mutation đều làm mới cả danh sách lẫn nhật ký sửa của mã. */
function useRefreshProducts() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["audit-log", "san_pham"] });
  };
}

export function useSaveProduct() {
  const refresh = useRefreshProducts();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: ProductInput;
      includeSalePrice: boolean;
    }) => {
      if (input.id) {
        await updateProduct(input.id, input.values, input.includeSalePrice);
        return input.id;
      }
      return createProduct(input.values, input.includeSalePrice);
    },
    onSuccess: refresh,
  });
}

export function useBulkAssign() {
  const refresh = useRefreshProducts();

  return useMutation({
    mutationFn: (input: {
      ids: string[];
      change: BulkChange;
      source: BulkChangeSource;
    }) => bulkAssign(input.ids, input.change, input.source),
    onSuccess: refresh,
  });
}

export function useApplyStageSuggestions() {
  const refresh = useRefreshProducts();

  return useMutation({
    mutationFn: (ids: string[]) => applyStageSuggestions(ids),
    onSuccess: refresh,
  });
}

export function useConfirmReviewed() {
  const refresh = useRefreshProducts();

  return useMutation({
    mutationFn: (ids: string[]) => confirmReviewed(ids),
    onSuccess: refresh,
  });
}
