// File thuần (bẫy 9): chi tiết mã hàng dạng dòng mở rộng ở /danh-muc — component
// và scripts/test-pure-functions.ts cùng import.
import type { ProductFormValues } from "../schemas/product.schema";

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
type ProductFormSource = Omit<ProductFormValues, "unitId" | "stageId" | "manualFields"> & {
  unitId: string | null;
  stageId: string | null;
  manualFields: string[];
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
    description: product.description ?? null,
    isActive: product.isActive,
    kind: product.kind,
    directSale: product.directSale,
    brandCode: product.brandCode,
    modelCode: product.modelCode,
    partCode: product.partCode,
    sharedVehicles: product.sharedVehicles,
    // Cột text[] có CHECK 4 giá trị (0087) — kiểu sinh ra chỉ biết string[].
    manualFields: product.manualFields as ProductFormValues["manualFields"],
    shelfLocation: product.shelfLocation,
  };
}

/**
 * Hãng / Dòng / Linh kiện lưu MÃ (0086), tên tra bộ mã hóa. Mã không còn trong
 * bộ mã hóa (bên làm mã đổi/bỏ) vẫn hiện mã để người dùng thấy và sửa.
 */
export function standardFieldText(name: string | null, code: string | null): string | null {
  if (name) return name;
  if (code) return `${code} (không có trong bộ mã hóa)`;
  return null;
}
