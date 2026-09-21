import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api được chạm vào các kiểu này. Component và hook luôn nhận kiểu đã map.

type InventoryRowDb = Fn["danh_sach_ton_kho"]["Returns"][number];
type ReorderSuggestionDb = Fn["de_xuat_dinh_muc"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

export type InventoryRow = {
  id: string;
  code: string;
  name: string;
  // Nhóm, công đoạn, ĐVT đến từ LEFT JOIN trong RPC (0058) — mã chưa gán thì null,
  // dù kiểu sinh tự động ghi là `string`.
  categoryId: string | null;
  categoryName: string | null;
  stageId: string | null;
  stageCode: string | null;
  stageName: string | null;
  stageColor: string | null;
  unitName: string | null;
  /**
   * Khóa là id kho. Kho chưa từng có dòng tồn của mã thì KHÔNG có khóa — giao diện
   * đọc `stockByWarehouse[warehouseId] ?? 0`. Thủ kho chỉ thấy kho được phân (RPC lọc).
   */
  stockByWarehouse: Record<string, number>;
  totalStock: number;
  minStock: number;
  isActive: boolean;
  /** Tổng số dòng của cả bộ lọc — RPC nhét vào mọi dòng. */
  totalRows: number;
};

/**
 * Giá trị `nguon_de_xuat` mà RPC `de_xuat_dinh_muc` trả về, đồng thời là giá trị
 * của tham số `p_nguon` — hợp đồng với database (0060), giữ nguyên chuỗi tiếng
 * Việt, cùng lý do với `STOCK_STATUSES` trong `schemas/inventory.schema.ts`.
 */
export const SUGGESTION_BASES = [
  "theo_ma",
  "trung_binh_nhom",
  "khong_du_lieu",
] as const;
export type SuggestionBasis = (typeof SUGGESTION_BASES)[number];

export const SUGGESTION_BASIS_LABELS: Record<SuggestionBasis, string> = {
  theo_ma: "Theo lịch sử bán của mã",
  trung_binh_nhom: "Trung bình nhóm hàng",
  khong_du_lieu: "Chưa có dữ liệu",
};

export type ReorderSuggestion = {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  currentLevel: number;
  suggestedLevel: number;
  basis: SuggestionBasis;
  /** Độ dài cửa sổ lưu trữ KiotViet (tính trên toàn bộ lưu trữ, không riêng mã). */
  dataDays: number;
  /** Số hóa đơn khác nhau có mã này — căn cứ để người duyệt biết số có đáng tin. */
  saleCount: number;
  totalSold: number;
  /** Với `trung_binh_nhom`: số mã cùng nhóm có lịch sử bán đã đem ra lấy trung bình. */
  peersWithHistory: number;
  totalRows: number;
};

// --- Mapper: database -> miền ----------------------------------------------

/**
 * `ton_theo_kho` là jsonb `{kho_id: so_luong}` nên kiểu sinh ra là `Json`. Thu hẹp
 * từ `unknown` thay vì tin kiểu: RPC đổi hình dạng thì màn hình hiện 0, không vỡ.
 */
function toStockMap(value: unknown): Record<string, number> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const stock: Record<string, number> = {};
  for (const [warehouseId, quantity] of Object.entries(
    value as Record<string, unknown>,
  )) {
    stock[warehouseId] = Number(quantity);
  }
  return stock;
}

function isSuggestionBasis(value: string): value is SuggestionBasis {
  return (SUGGESTION_BASES as readonly string[]).includes(value);
}

export function toInventoryRow(row: InventoryRowDb): InventoryRow {
  return {
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryId: row.nhom_hang_id,
    categoryName: row.ten_nhom_hang,
    stageId: row.cong_doan_id,
    stageCode: row.ma_cong_doan,
    stageName: row.ten_cong_doan,
    stageColor: row.mau_cong_doan,
    unitName: row.ten_dvt,
    stockByWarehouse: toStockMap(row.ton_theo_kho),
    // PostgREST trả `numeric` dưới dạng CHUỖI — ép về number ngay tại đây.
    totalStock: Number(row.tong_ton),
    minStock: Number(row.ton_toi_thieu),
    isActive: row.dang_kinh_doanh,
    totalRows: Number(row.tong_so_dong),
  };
}

export function toReorderSuggestion(
  row: ReorderSuggestionDb,
): ReorderSuggestion {
  return {
    id: row.id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryName: row.ten_nhom_hang,
    currentLevel: Number(row.dinh_muc_hien_tai),
    suggestedLevel: Number(row.dinh_muc_de_xuat),
    // Giá trị lạ từ database rơi về "không có dữ liệu": thà nói không biết còn hơn
    // gắn nhãn "theo lịch sử bán" cho một con số không rõ nguồn.
    basis: isSuggestionBasis(row.nguon_de_xuat)
      ? row.nguon_de_xuat
      : "khong_du_lieu",
    dataDays: row.so_ngay_du_lieu,
    saleCount: row.so_lan_ban,
    totalSold: Number(row.tong_da_ban),
    peersWithHistory: row.so_ma_trong_nhom_co_lich_su,
    totalRows: Number(row.tong_so_dong),
  };
}
