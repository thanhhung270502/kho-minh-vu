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
