"use client";

import { Badge, Button } from "antd";

import type { ProductFilter } from "../schemas/filter.schema";
import { ExcelButton } from "./excel-button";

type Props = {
  filter: ProductFilter;
  total: number;
  reviewCount: number;
  canEdit: boolean;
  onFilterChange: (filter: ProductFilter) => void;
  onOpenImport?: () => void;
  onOpenCostImport?: () => void;
};

/** Nút "Cần rà" (badge số lượng) + nút xuất/nhập Excel — cụm hành động phụ trên thanh công cụ. */
export function ReviewActions({
  filter,
  total,
  reviewCount,
  canEdit,
  onFilterChange,
  onOpenImport,
  onOpenCostImport,
}: Props) {
  return (
    <>
      <Badge count={reviewCount} overflowCount={9999} size="small">
        <Button
          type={filter.needsReview ? "primary" : "default"}
          onClick={() =>
            onFilterChange({ ...filter, needsReview: !filter.needsReview, page: 1 })
          }
        >
          Cần rà
        </Button>
      </Badge>
      <ExcelButton
        filter={filter}
        productCount={total}
        onOpenImport={canEdit ? onOpenImport : undefined}
        onOpenCostImport={onOpenCostImport}
      />
    </>
  );
}
