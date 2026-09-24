import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api/types được chạm vào các kiểu này. Component/hook luôn nhận kiểu đã map.

type SessionRowDb = Fn["danh_sach_phien_kiem_ke"]["Returns"][number];
type CountSheetRowDb = Fn["bang_dem_kiem_ke"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

export type StocktakeSessionState = "NHAP_LIEU" | "HOAN_THANH" | "DA_HUY";

export type StocktakeSession = {
  id: string;
  docNo: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  /** `null` = toàn kho, không giới hạn nhóm hàng. */
  categoryIds: string[] | null;
  categoryNames: string | null;
  state: StocktakeSessionState;
  countedCount: number;
  scopeCount: number;
  recountCount: number;
  createdBy: string;
  postedAt: string | null;
  createdAt: string;
};

export type CountSheetRow = {
  productId: string;
  code: string;
  name: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
  /** `null` = chưa có dòng đếm cho mã này trong phiên. */
  lineId: string | null;
  counted: number | null;
  bookQuantity: number | null;
  discrepancy: number | null;
  currentStock: number;
  kiotVietStock: number | null;
  countedAt: string | null;
  countedBy: string | null;
  needsRecount: boolean;
};

export type StocktakeLookups = {
  warehouses: { id: string; code: string; name: string }[];
  categories: { id: string; code: string; name: string }[];
  /** Kho được phân cho chính thủ kho đang đăng nhập — rỗng với quản lý/văn phòng. */
  assignedWarehouseIds: string[];
};

// --- Mapper: database -> miền ------------------------------------------------

export function toStocktakeSession(row: SessionRowDb): StocktakeSession {
  return {
    id: row.id,
    docNo: row.so_ct,
    date: row.ngay_ct,
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    categoryIds: row.pham_vi_nhom_hang,
    categoryNames: row.ten_nhom_pham_vi,
    state: row.trang_thai,
    countedCount: Number(row.so_da_dem),
    scopeCount: Number(row.so_trong_pham_vi),
    recountCount: Number(row.so_dem_lai),
    createdBy: row.nguoi_tao,
    postedAt: row.ngay_ghi_so,
    createdAt: row.created_at,
  };
}

export function toCountSheetRow(row: CountSheetRowDb): CountSheetRow {
  return {
    productId: row.san_pham_id,
    code: row.ma_hang,
    name: row.ten_hang,
    unitName: row.ten_dvt,
    categoryId: row.nhom_hang_id,
    categoryName: row.ten_nhom,
    lineId: row.dong_id,
    counted: row.so_dem === null ? null : Number(row.so_dem),
    bookQuantity: row.ton_so === null ? null : Number(row.ton_so),
    discrepancy: row.lech === null ? null : Number(row.lech),
    currentStock: Number(row.ton_hien_tai),
    kiotVietStock: row.ton_kiotviet === null ? null : Number(row.ton_kiotviet),
    countedAt: row.dem_luc,
    countedBy: row.nguoi_dem,
    needsRecount: row.dem_lai,
  };
}
