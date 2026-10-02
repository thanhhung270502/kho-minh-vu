import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api được chạm vào các kiểu này. Component và hook luôn nhận kiểu đã map.

type ReorderSuggestionDb = Fn["de_xuat_dinh_muc"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

/**
 * Giá trị `nguon_de_xuat` mà RPC `de_xuat_dinh_muc` trả về, đồng thời là giá trị
 * của tham số `p_nguon` — hợp đồng với database (0060), giữ nguyên chuỗi tiếng
 * Việt.
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

function isSuggestionBasis(value: string): value is SuggestionBasis {
  return (SUGGESTION_BASES as readonly string[]).includes(value);
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
