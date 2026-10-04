"use client";

import type { TableColumnType } from "antd";

import { ProductThumbnailCell } from "@/features/images/components/product-thumbnail-cell";

import type { ProductRow } from "../types";

/** Cột ảnh đầu bảng danh mục — thumbnail ảnh chính hoặc ô xám khi chưa có (D-15, D-17). Tiêu đề để trống. */
export function thumbnailColumn(): TableColumnType<ProductRow> {
  return {
    title: "",
    key: "image",
    width: 56,
    fixed: "left",
    align: "center",
    render: (_: unknown, row: ProductRow) => (
      <ProductThumbnailCell productId={row.id} primaryImageId={row.primaryImageId} />
    ),
  };
}
