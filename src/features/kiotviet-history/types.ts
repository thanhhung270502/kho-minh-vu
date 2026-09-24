import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api được chạm vào kiểu này. Component/hook luôn nhận kiểu đã map.

type KiotVietHistoryRowDb = Fn["tra_cuu_lich_su_kiotviet"]["Returns"][number];

export type KiotVietHistorySource = "NHAP" | "XUAT";

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

export type KiotVietHistoryRow = {
  source: KiotVietHistorySource;
  voucherNo: string;
  date: string | null;
  partner: string | null;
  productCode: string | null;
  productName: string | null;
  quantity: number;
  note: string | null;
};

export type KiotVietHistoryPage = {
  rows: KiotVietHistoryRow[];
  total: number;
  totalIn: number;
  totalOut: number;
};

function toSource(value: string): KiotVietHistorySource {
  if (value === "NHAP" || value === "XUAT") return value;
  // RPC chỉ nên trả hai giá trị này (0064) — nguồn lạ là lỗi dữ liệu, không phải
  // trường hợp nên âm thầm coi là "XUAT".
  throw new Error(`Nguồn lịch sử lạ: ${value}`);
}

// --- Mapper: database -> miền ------------------------------------------------

export function toKiotVietHistoryRow(row: KiotVietHistoryRowDb): KiotVietHistoryRow {
  return {
    source: toSource(row.nguon),
    voucherNo: row.ma_phieu,
    date: row.ngay ?? null,
    partner: row.doi_tac ?? null,
    productCode: row.ma_hang ?? null,
    productName: row.ten_hang ?? null,
    quantity: Number(row.so_luong),
    note: row.ghi_chu ?? null,
  };
}
