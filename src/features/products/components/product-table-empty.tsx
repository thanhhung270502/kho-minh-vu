"use client";

import { Button } from "antd";

import { DEFAULT_PRODUCT_FILTER, type ProductFilter } from "../schemas/filter.schema";

function hasActiveFilter(filter: ProductFilter): boolean {
  return (
    filter.categoryId !== null ||
    filter.stageId !== null ||
    filter.unitId !== null ||
    filter.stockStatus !== null ||
    filter.hasImage !== null ||
    filter.standard !== null ||
    filter.tradingStatus !== DEFAULT_PRODUCT_FILTER.tradingStatus
  );
}

/** Trạng thái rỗng của bảng danh mục — nói rõ vì sao rỗng và cách thoát. */
export function ProductTableEmpty({
  filter,
  onClearFilter,
}: {
  filter: ProductFilter;
  onClearFilter: () => void;
}) {
  if (filter.q) return <>{`Không có mã khớp “${filter.q}”. Thử gõ ít chữ hơn hoặc bỏ dấu.`}</>;
  if (hasActiveFilter(filter)) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span>Không có mã nào khớp bộ lọc. Xóa bớt điều kiện.</span>
        <Button size="small" onClick={onClearFilter}>
          Xóa bộ lọc
        </Button>
      </div>
    );
  }
  return <>Chưa có mã hàng nào. Bấm “Thêm mã hàng” hoặc nhập từ Excel.</>;
}
