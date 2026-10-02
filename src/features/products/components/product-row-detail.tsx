"use client";

import type { ProductForecast } from "../lib/product-expanded";
import { ProductExpandedDetail } from "./product-expanded-detail";
import { ProductRowActions } from "./product-row-actions";

type Props = {
  productId: string;
  /** undefined = không có quyền xem phân tích. */
  forecast: ProductForecast | null | undefined;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
};

/** Chi tiết dòng + hàng nút — dùng cho cả dòng mở rộng (máy tính) và ngăn kéo (điện thoại). */
export function ProductRowDetail({ productId, forecast, canEdit, onEdit, onCopy }: Props) {
  return (
    <ProductExpandedDetail
      productId={productId}
      forecast={forecast}
      renderActions={(product) => (
        <ProductRowActions product={product} canEdit={canEdit} onEdit={onEdit} onCopy={onCopy} />
      )}
    />
  );
}
