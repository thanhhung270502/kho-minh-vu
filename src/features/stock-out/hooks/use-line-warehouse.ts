"use client";

import { useQueryClient } from "@tanstack/react-query";

import type { ProductSearchResult } from "@/shared/components/product-search-input";

import { fetchWarehouseWithMostStock } from "../api/issue.api";
import { issueKeys } from "../api/issue.keys";

export type LineWarehouse = {
  /** null khi mã chưa gán kho, không đâu còn hàng và phiếu cũng chưa có kho. */
  warehouseId: string | null;
  /** Có tên khi kho được chọn theo tồn — để báo người dùng biết dòng đi kho nào. */
  stockedWarehouseName: string | null;
};

/**
 * Kho ẩn trên hóa đơn nên kho của dòng phải tự chọn đúng: kho mặc định của mã;
 * mã chưa gán thì kho đang còn nhiều hàng nhất; không đâu còn hàng mới rơi về kho
 * đầu phiếu. `prefetch` gọi lúc chọn mã để lúc lưu dòng thường đã có sẵn kết quả.
 */
export function useLineWarehouse() {
  const queryClient = useQueryClient();

  function stockedQuery(productId: string) {
    return {
      queryKey: issueKeys.stockedWarehouse(productId),
      queryFn: () => fetchWarehouseWithMostStock(productId),
      staleTime: 30_000,
    };
  }

  function prefetch(product: ProductSearchResult) {
    if (product.defaultWarehouseId) return;
    void queryClient.prefetchQuery(stockedQuery(product.id));
  }

  async function resolve(
    product: ProductSearchResult,
    headerWarehouseId: string | null,
  ): Promise<LineWarehouse> {
    if (product.defaultWarehouseId) {
      return { warehouseId: product.defaultWarehouseId, stockedWarehouseName: null };
    }
    const stocked = await queryClient.fetchQuery(stockedQuery(product.id));
    if (!stocked) return { warehouseId: headerWarehouseId, stockedWarehouseName: null };
    return { warehouseId: stocked.warehouseId, stockedWarehouseName: stocked.warehouseName };
  }

  return { prefetch, resolve };
}
