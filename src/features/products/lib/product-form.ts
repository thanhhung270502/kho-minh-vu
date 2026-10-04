// File thuần (bẫy 9): giá trị mặc định + chuyển đổi của form mã hàng.
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import type { ProductFormValues } from "../schemas/product.schema";
import type { Lookups, ProductInput } from "../types";

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  code: "",
  name: "",
  categoryId: null,
  unitId: "",
  stageId: "",
  conversion: 1,
  defaultWarehouseId: null,
  minStock: 0,
  maxStock: null,
  barcode: null,
  description: null,
  isActive: true,
  kind: "HANG_HOA",
  directSale: true,
  shelfLocation: null,
  brandCode: null,
  modelCode: null,
  partCode: null,
  sharedVehicles: [],
  manualFields: [],
};

/** Mã mới mặc định ĐVT "CAI" + công đoạn "MUA_NGOAI" — đúng đa số hàng thương mại. */
export function defaultsForNewProduct(lookups: Lookups | undefined): ProductFormValues {
  return {
    ...EMPTY_PRODUCT_FORM,
    unitId: lookups?.units.find((unit) => unit.code === "CAI")?.id ?? "",
    stageId: lookups?.stages.find((stage) => stage.code === "MUA_NGOAI")?.id ?? "",
  };
}

/** "Tạo tiếp mã khác": giữ nhóm / loại / ĐVT / xử lý / kho để nhập loạt mã cùng loại. */
export function nextProductDefaults(kept: ProductFormValues): ProductFormValues {
  return {
    ...EMPTY_PRODUCT_FORM,
    categoryId: kept.categoryId,
    kind: kept.kind,
    unitId: kept.unitId,
    stageId: kept.stageId,
    defaultWarehouseId: kept.defaultWarehouseId,
  };
}

export function toProductInput(values: ProductFormValues): ProductInput {
  return {
    code: values.code,
    name: values.name,
    categoryId: values.categoryId,
    unitId: values.unitId,
    stageId: values.stageId,
    conversion: Number(values.conversion),
    defaultWarehouseId: values.defaultWarehouseId,
    minStock: Number(values.minStock),
    maxStock: values.maxStock === null ? null : Number(values.maxStock),
    barcode: values.barcode,
    description: values.description,
    isActive: values.isActive,
    kind: values.kind,
    directSale: values.directSale,
    shelfLocation: values.shelfLocation,
    brandCode: values.brandCode,
    modelCode: values.modelCode,
    partCode: values.partCode,
    sharedVehicles: values.sharedVehicles,
    manualFields: values.manualFields,
  };
}

/** Lỗi lưu mã hàng → ô cần báo (mã trùng về ô Mã hàng, còn lại lên đầu form). */
export function productSaveError(error: unknown): { field: "code" | "root"; message: string } {
  if (isPostgrestError(error)) {
    if (error.code === "23505") return { field: "code", message: "Mã hàng đã tồn tại. Dùng mã khác." };
    if (error.code === "42501") {
      return { field: "root", message: "Tài khoản không có quyền sửa danh mục. Nhờ quản lý thao tác giúp." };
    }
    if (error.code === "23514") return { field: "root", message: error.message };
  }
  const explained = explainError(error);
  return { field: "root", message: `${explained.title}. ${explained.action}` };
}
