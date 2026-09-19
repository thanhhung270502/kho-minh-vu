import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api được chạm vào các kiểu này. Component luôn nhận kiểu đã map.

type ProductRowDb = Fn["danh_sach_san_pham"]["Returns"][number];
type ProductDetailDb = Fn["chi_tiet_san_pham"]["Returns"][number];
type StockCardRowDb = Fn["the_kho_san_pham"]["Returns"][number];
type StageSuggestionDb = Fn["goi_y_cong_doan_theo_duoi"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string | null;
  unitName: string | null;
  stageId: string | null;
  stageCode: string | null;
  stageName: string | null;
  stageColor: string | null;
  conversion: number;
  defaultWarehouseId: string | null;
  minStock: number;
  maxStock: number | null;
  salePrice: number;
  /** Chỉ về khi vai trò có quyền xem giá vốn (RPC tự lọc). */
  costPrice: number;
  totalStock: number;
  isActive: boolean;
  needsReview: boolean;
  unitNeedsReview: boolean;
  updatedAt: string;
  /** Tổng số dòng của cả bộ lọc — RPC nhét vào mọi dòng. */
  totalRows: number;
};

export type ProductDetail = ProductRow & {
  barcode: string | null;
  note: string | null;
  imageUrl: string | null;
  shelfLocation: string | null;
  defaultWarehouseName: string | null;
  createdAt: string;
};

export type StockCardRow = {
  documentId: string;
  docNo: string;
  docType: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  quantityIn: number;
  quantityOut: number;
  costPriceAtTime: number;
  partner: string | null;
  source: string | null;
  note: string | null;
  isReversal: boolean;
  totalRows: number;
};

export type StageSuggestion = {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  suggestedStageId: string;
  suggestedStageCode: string;
  suggestedStageName: string;
};

export type LookupItem = { id: string; code: string; name: string };
export type StageLookupItem = LookupItem & { color: string | null };

export type Lookups = {
  categories: LookupItem[];
  units: LookupItem[];
  stages: StageLookupItem[];
  warehouses: LookupItem[];
};

export type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
};

export type CatalogPermissions = {
  canEdit: boolean;
  canViewCost: boolean;
  canEditSalePrice: boolean;
};

/**
 * Trường ghi được của mã hàng.
 *
 * `costPrice` KHÔNG có ở đây: chỉ trigger giá vốn ghi cột đó, client không có
 * quyền (migration 0015 + 0029).
 */
export type ProductInput = {
  code: string;
  name: string;
  categoryId: string | null;
  unitId: string;
  stageId: string;
  conversion: number;
  defaultWarehouseId: string | null;
  minStock: number;
  maxStock: number | null;
  salePrice: number;
  barcode: string | null;
  note: string | null;
  isActive: boolean;
};

/** Payload gửi thẳng vào `.insert()` / `.update()` của supabase-js. */
export type ProductInsert = Database["public"]["Tables"]["san_pham"]["Insert"];

export function toProductInsert(input: ProductInput): ProductInsert {
  return {
    ma_hang: input.code,
    ten_hang: input.name,
    nhom_hang_id: input.categoryId,
    dvt_id: input.unitId,
    cong_doan_id: input.stageId,
    quy_doi: input.conversion,
    kho_mac_dinh_id: input.defaultWarehouseId,
    ton_toi_thieu: input.minStock,
    ton_toi_da: input.maxStock,
    gia_ban: input.salePrice,
    barcode: input.barcode,
    ghi_chu: input.note,
    dang_kinh_doanh: input.isActive,
  };
}

// --- Mapper: database -> miền ----------------------------------------------

export function toProductRow(row: ProductRowDb): ProductRow {
  return {
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryId: row.nhom_hang_id,
    categoryName: row.ten_nhom_hang,
    unitId: row.dvt_id,
    unitName: row.ten_dvt,
    stageId: row.cong_doan_id,
    stageCode: row.ma_cong_doan,
    stageName: row.ten_cong_doan,
    stageColor: row.mau_cong_doan,
    conversion: Number(row.quy_doi),
    defaultWarehouseId: row.kho_mac_dinh_id,
    minStock: Number(row.ton_toi_thieu),
    maxStock: row.ton_toi_da === null ? null : Number(row.ton_toi_da),
    salePrice: Number(row.gia_ban),
    costPrice: Number(row.gia_von),
    totalStock: Number(row.tong_ton),
    isActive: row.dang_kinh_doanh,
    needsReview: row.can_ra,
    unitNeedsReview: row.can_ra_dvt,
    updatedAt: row.updated_at,
    totalRows: Number(row.tong_so_dong),
  };
}

export function toProductDetail(row: ProductDetailDb): ProductDetail {
  return {
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryId: row.nhom_hang_id,
    categoryName: row.ten_nhom_hang,
    unitId: row.dvt_id,
    unitName: row.ten_dvt,
    stageId: row.cong_doan_id,
    stageCode: row.ma_cong_doan,
    stageName: row.ten_cong_doan,
    stageColor: row.mau_cong_doan,
    conversion: Number(row.quy_doi),
    defaultWarehouseId: row.kho_mac_dinh_id,
    minStock: Number(row.ton_toi_thieu),
    maxStock: row.ton_toi_da === null ? null : Number(row.ton_toi_da),
    salePrice: Number(row.gia_ban),
    costPrice: Number(row.gia_von),
    totalStock: Number(row.tong_ton),
    isActive: row.dang_kinh_doanh,
    needsReview: row.can_ra,
    unitNeedsReview: row.can_ra_dvt,
    updatedAt: row.updated_at,
    // Chi tiết trả đúng một mã — không có khái niệm tổng số dòng.
    totalRows: 1,
    barcode: row.barcode,
    note: row.ghi_chu,
    imageUrl: row.hinh_anh_url,
    shelfLocation: row.vi_tri_ke,
    defaultWarehouseName: row.ten_kho_mac_dinh,
    createdAt: row.created_at,
  };
}

export function toStockCardRow(row: StockCardRowDb): StockCardRow {
  return {
    documentId: row.chung_tu_id,
    docNo: row.so_ct,
    docType: row.loai_ct,
    date: row.ngay,
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    quantityIn: Number(row.so_luong_nhap),
    quantityOut: Number(row.so_luong_xuat),
    costPriceAtTime: Number(row.gia_von_tai_thoi_diem),
    partner: row.doi_tac,
    source: row.nguon,
    note: row.ghi_chu,
    isReversal: row.la_but_toan_dao,
    totalRows: Number(row.tong_so_dong),
  };
}

export function toStageSuggestion(row: StageSuggestionDb): StageSuggestion {
  return {
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryName: row.ten_nhom_hang,
    suggestedStageId: row.cong_doan_de_xuat_id,
    suggestedStageCode: row.ma_cong_doan_de_xuat,
    suggestedStageName: row.ten_cong_doan_de_xuat,
  };
}

// --- Mapper: miền -> database ----------------------------------------------

/**
 * Ánh xạ trường miền sang tên cột `san_pham`. Dùng cho sửa nhanh trên bảng và
 * gán hàng loạt — hai chỗ gửi thẳng tên cột xuống RPC.
 */
export const PRODUCT_FIELD_TO_COLUMN = {
  categoryId: "nhom_hang_id",
  unitId: "dvt_id",
  stageId: "cong_doan_id",
  isActive: "dang_kinh_doanh",
} as const;

export type EditableProductField = keyof typeof PRODUCT_FIELD_TO_COLUMN;
