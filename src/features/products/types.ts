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
  totalStock: number;
  isActive: boolean;
  needsReview: boolean;
  unitNeedsReview: boolean;
  updatedAt: string;
  /** Tổng số dòng của cả bộ lọc — RPC nhét vào mọi dòng. */
  totalRows: number;
  /**
   * Id ảnh chính — KHÔNG đến từ RPC `danh_sach_san_pham`. `fetchProducts` gắn
   * thêm bằng một truy vấn riêng theo danh sách id của trang (09-11).
   */
  primaryImageId: string | null;
};

export type ProductDetail = ProductRow & {
  barcode: string | null;
  note: string | null;
  imageUrl: string | null;
  shelfLocation: string | null;
  defaultWarehouseName: string | null;
  createdAt: string;
  directSale: boolean;
  description: string | null;
  kind: ProductKind;
  /** Mã trong bộ mã hóa + tên tra được (null khi mã không còn trong bộ mã hóa). */
  brandCode: string | null;
  brandName: string | null;
  modelCode: string | null;
  modelName: string | null;
  partCode: string | null;
  partName: string | null;
  /** Mã xử lý quy chuẩn của công đoạn; null = công đoạn ngoài quy chuẩn. */
  finishCode: string | null;
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
  partner: string | null;
  source: string | null;
  note: string | null;
  isReversal: boolean;
  totalRows: number;
  // Luôn có giá trị với dòng hệ thống hiện tại (0064 đã bỏ nhánh KiotViet cũ khỏi
  // the_kho_san_pham) — kiểu vẫn để `| null` vì RPC dùng CASE, không cam kết cứng.
  runningBalance: number | null;
  /** Mã lý do xuất âm của phiếu (chung_tu.ly_do_xuat_am) — chỉ có ở dòng xuất của phiếu đó. */
  negativeReason: string | null;
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

/** Giá trị CHECK của san_pham.loai_hang (0086) — hợp đồng với database. */
export type ProductKind = "HANG_HOA" | "COMBO";

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  HANG_HOA: "Hàng hóa",
  COMBO: "Combo",
};

export type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
};

export type CatalogPermissions = {
  canEdit: boolean;
};

/**
 * Trường ghi được của mã hàng.
 *
 * Không có giá: giao diện không dùng giá (Phase 10, GON-03). `gia_ban` giữ
 * nguyên trong DB vì payload không bao giờ mang khóa đó; `gia_von` chỉ trigger
 * ghi được (migration 0015 + 0029).
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
  barcode: string | null;
  /** Mô tả sản phẩm (mo_ta). Ghi chú là cột tự sinh — form không ghi. */
  description: string | null;
  isActive: boolean;
  kind: ProductKind;
  directSale: boolean;
  shelfLocation: string | null;
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
    barcode: input.barcode,
    mo_ta: input.description,
    dang_kinh_doanh: input.isActive,
    loai_hang: input.kind,
    duoc_ban_truc_tiep: input.directSale,
    vi_tri_ke: input.shelfLocation,
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
    totalStock: Number(row.tong_ton),
    isActive: row.dang_kinh_doanh,
    needsReview: row.can_ra,
    unitNeedsReview: row.can_ra_dvt,
    updatedAt: row.updated_at,
    totalRows: Number(row.tong_so_dong),
    primaryImageId: null,
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
    totalStock: Number(row.tong_ton),
    isActive: row.dang_kinh_doanh,
    needsReview: row.can_ra,
    unitNeedsReview: row.can_ra_dvt,
    updatedAt: row.updated_at,
    // Chi tiết trả đúng một mã — không có khái niệm tổng số dòng.
    totalRows: 1,
    // Chi tiết mã để null — thư viện ảnh (09-10) tự tải danh sách ảnh, không
    // cần ảnh chính gắn sẵn ở đây.
    primaryImageId: null,
    barcode: row.barcode,
    note: row.ghi_chu,
    imageUrl: row.hinh_anh_url,
    shelfLocation: row.vi_tri_ke,
    defaultWarehouseName: row.ten_kho_mac_dinh,
    createdAt: row.created_at,
    directSale: row.duoc_ban_truc_tiep,
    description: row.mo_ta,
    // Cột text có CHECK HANG_HOA/COMBO (0086) — kiểu sinh ra chỉ biết `string`.
    kind: row.loai_hang === "COMBO" ? "COMBO" : "HANG_HOA",
    brandCode: row.hang_xe,
    brandName: row.ten_hang_xe,
    modelCode: row.dong_xe,
    modelName: row.ten_dong_xe,
    partCode: row.linh_kien,
    partName: row.ten_linh_kien,
    finishCode: row.ma_xu_ly,
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
    partner: row.doi_tac,
    source: row.nguon,
    note: row.ghi_chu,
    isReversal: row.la_but_toan_dao,
    totalRows: Number(row.tong_so_dong),
    // Kiểu sinh ghi `number` nhưng RPC trả null cho dòng KiotViet — Number(null) ra 0
    // và sẽ hiện "0" sai ở mọi dòng đó.
    runningBalance: row.ton_luy_ke === null ? null : Number(row.ton_luy_ke),
    // Kiểu sinh ghi `string` nhưng RPC trả null với mọi dòng không phải xuất âm.
    negativeReason: row.ly_do_xuat_am ?? null,
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
