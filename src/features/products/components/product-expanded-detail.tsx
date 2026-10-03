"use client";

import { Skeleton, Tabs, Typography } from "antd";
import type { ReactNode } from "react";

import { explainError } from "@/shared/lib/errors";

import { useProductDetail } from "../hooks/useProducts";
import type { ProductForecast } from "../lib/product-expanded";
import type { ProductDetail } from "../types";
import { ProductInfoTab } from "./product-info-tab";
import { StockCard } from "./stock-card";
import { WarehouseStock } from "./warehouse-stock";

type Props = {
  productId: string;
  forecast: ProductForecast | null | undefined;
  /** Hàng nút đáy — bảng ghép vào (Chỉnh sửa, Sao chép, Ngừng KD, Xem chi tiết). */
  renderActions?: (product: ProductDetail) => ReactNode;
};

/**
 * Chi tiết mã hàng mở ngay dưới dòng được bấm ở /danh-muc (ảnh mẫu KiotViet).
 * Điện thoại dùng cùng nội dung trong ngăn kéo toàn màn.
 */
export function ProductExpandedDetail({ productId, forecast, renderActions }: Props) {
  const detail = useProductDetail(productId);
  const product = detail.data;

  if (detail.isPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (detail.isError) {
    return (
      <Typography.Text type="danger">
        {explainError(detail.error).title}.{" "}
        <Typography.Link onClick={() => void detail.refetch()}>Thử lại</Typography.Link>
      </Typography.Text>
    );
  }
  if (!product) return <Typography.Text type="secondary">Mã hàng này không còn trong danh mục.</Typography.Text>;

  return (
    <div className="flex flex-col">
      <Tabs
        size="small"
        items={[
          { key: "info", label: "Thông tin", children: <ProductInfoTab product={product} forecast={forecast} /> },
          {
            key: "note",
            label: "Mô tả, ghi chú",
            children: (
              <div className="flex flex-col gap-3">
                {product.description ? (
                  <p className="m-0 whitespace-pre-wrap">{product.description}</p>
                ) : (
                  <Typography.Text type="secondary">Chưa có mô tả.</Typography.Text>
                )}
                {/* Ghi chú do hệ thống tự sinh — liệt kê trường quy chuẩn còn thiếu. */}
                {product.note ? <Typography.Text type="warning">{product.note}</Typography.Text> : null}
              </div>
            ),
          },
          { key: "stock-card", label: "Thẻ kho", children: <StockCard productId={productId} /> },
          {
            key: "stock",
            label: "Tồn kho",
            children: <WarehouseStock productId={productId} unitName={product.unitName} />,
          },
        ]}
      />
      {renderActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {renderActions(product)}
        </div>
      ) : null}
    </div>
  );
}
