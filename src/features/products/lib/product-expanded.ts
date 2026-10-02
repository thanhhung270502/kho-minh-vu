// File thuần (bẫy 9): chi tiết mã hàng dạng dòng mở rộng ở /danh-muc — component
// và scripts/test-pure-functions.ts cùng import.
import type { ProductFormValues } from "../schemas/product.schema";

const formatQty = (n: number) => n.toLocaleString("vi-VN");

export function stockLimitLabel(min: number, max: number | null): string {
  return `${formatQty(min)} – ${max === null ? "không giới hạn" : formatQty(max)}`;
}

/** "Sao chép": mọi trường giữ nguyên, mã để trống, barcode bỏ (thường riêng cho từng mã). */
export function copyProductDefaults(source: ProductFormValues): ProductFormValues {
  return { ...source, code: "", barcode: null, isActive: true };
}

/** Phần số phân tích cần cho bảng — khớp `AnalysisRow` của feature analytics. */
type ForecastSource = {
  productId: string;
  customerOrdered: number;
  avgDailySales: number | null;
  daysOfCover: number | null;
  stockoutDate: string | null;
};

export type ProductForecast = {
  customerOrdered: number;
  stockoutDate: string | null;
  daysOfCover: number | null;
  /** false = không bán trong kỳ → hiện "Không bán", không có ngày dự kiến. */
  selling: boolean;
};

export function forecastById(rows: ReadonlyArray<ForecastSource>): Map<string, ProductForecast> {
  return new Map(
    rows.map((r) => [
      r.productId,
      {
        customerOrdered: r.customerOrdered,
        stockoutDate: r.stockoutDate,
        daysOfCover: r.daysOfCover,
        selling: r.avgDailySales !== null,
      },
    ]),
  );
}

export type ExpandedAction = "deactivate" | "reactivate" | "copy" | "detail" | "edit";

/** Hàng nút đáy theo ảnh mẫu: trái là thao tác phụ, phải là Xem chi tiết + Chỉnh sửa. */
export function expandedActions({ canEdit, isActive }: { canEdit: boolean; isActive: boolean }): ExpandedAction[] {
  if (!canEdit) return ["detail"];
  return [isActive ? "deactivate" : "reactivate", "copy", "detail", "edit"];
}

/** Phần chi tiết mã hàng mà form cần — khớp `ProductDetail`. */
type ProductFormSource = Omit<ProductFormValues, "unitId" | "stageId"> & {
  unitId: string | null;
  stageId: string | null;
};

/** Chi tiết mã → giá trị form (Sửa và Sao chép dùng chung). */
export function toProductFormValues(product: ProductFormSource): ProductFormValues {
  return {
    code: product.code,
    name: product.name,
    categoryId: product.categoryId ?? null,
    unitId: product.unitId ?? "",
    stageId: product.stageId ?? "",
    conversion: product.conversion,
    defaultWarehouseId: product.defaultWarehouseId ?? null,
    minStock: product.minStock,
    maxStock: product.maxStock,
    barcode: product.barcode ?? null,
    note: product.note ?? null,
    isActive: product.isActive,
    productTypeId: product.productTypeId,
    vehicleLineId: product.vehicleLineId,
    directSale: product.directSale,
    shelfLocation: product.shelfLocation,
  };
}
