"use client";

import { Descriptions, Skeleton, Tag, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductImagePreview } from "@/features/images/components/product-image-preview";
import { DetailPanel } from "@/shared/components/detail-panel";
import { explainError } from "@/shared/lib/errors";

import { useProductDetail } from "../hooks/useProducts";
import { formatNumber } from "./product-columns";

type Props = {
  productId: string;
  onClose: () => void;
  /** Khách đặt / dự kiến hết hàng — route ghép theo quyền, null là ẩn hẳn. */
  forecastSection?: ReactNode;
};

/** Panel bấm dòng ở /danh-muc (PANEL-01). Trang đầy đủ vẫn ở /danh-muc/<id>. */
export function ProductPanel({ productId, onClose, forecastSection }: Props) {
  const detail = useProductDetail(productId);
  const product = detail.data;

  return (
    <DetailPanel
      title={product ? <span className="font-mono">{product.code}</span> : "Mã hàng"}
      onClose={onClose}
      extra={
        <Link href={`/danh-muc/${productId}`} className="whitespace-nowrap text-sm">
          Xem chi tiết
        </Link>
      }
    >
      {detail.isPending ? (
        <Skeleton active />
      ) : detail.isError ? (
        <Typography.Text type="danger">
          {explainError(detail.error).title}.{" "}
          <Typography.Link onClick={() => void detail.refetch()}>Thử lại</Typography.Link>
        </Typography.Text>
      ) : !product ? (
        <Typography.Text type="secondary">Mã hàng này không còn trong danh mục.</Typography.Text>
      ) : (
        <div className="flex flex-col gap-3">
          <ProductImagePreview productId={productId} />
          <Descriptions
            size="small"
            column={1}
            items={[
              { key: "code", label: "Mã hàng", children: <span className="font-mono">{product.code}</span> },
              { key: "name", label: "Tên hàng", children: product.name },
              {
                key: "stock",
                label: "Tồn kho",
                children: (
                  <span className="tabular-nums">
                    {formatNumber(product.totalStock)} {product.unitName ?? ""}
                    {product.isActive ? null : <Tag className="ml-2">Ngừng KD</Tag>}
                  </span>
                ),
              },
            ]}
          />
          {forecastSection}
        </div>
      )}
    </DetailPanel>
  );
}
