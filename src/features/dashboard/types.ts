import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api và mapper ở đây được chạm vào các kiểu này. Component và hook
// luôn nhận kiểu đã map (CLAUDE.md Bước 3-4).

type SalesPaceRowDb = Fn["nhip_ban"]["Returns"][number];
type NegativeStockRowDb = Fn["bao_cao_xuat_am"]["Returns"][number];
type StockByGroupRowDb = Fn["ton_theo_nhom"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

export type SalesPaceDay = {
  date: string;
  documentCount: number;
  lineCount: number;
  productCount: number;
};

export type SalesPace = {
  today: SalesPaceDay;
  yesterday: SalesPaceDay;
};

/**
 * `bao_cao_xuat_am` chỉ gồm hai loại chứng từ bị ép chọn lý do xuất âm
 * (`ghi_so_chung_tu`, 0051/0069) — D-03.
 */
export type DocumentKind = "XUAT" | "TRA_NCC";

export type NegativeStockLine = {
  /** `dong_id` — khóa có sẵn từ database, dùng làm `key` cho bảng (bẫy 11). */
  key: string;
  documentId: string;
  documentNumber: string;
  documentKind: DocumentKind;
  warehouseName: string;
  productId: string;
  productCode: string;
  productName: string;
  issuedQuantity: number;
  balanceAfter: number;
  createdBy: string | null;
  reasonCode: string | null;
  reasonNote: string | null;
};

export type StockByGroupRow = {
  /** `nhom_id` (mã chưa gán nhóm/công đoạn) → `"__none__"` để bảng vẫn có key. */
  key: string;
  groupId: string | null;
  groupName: string | null;
  total: number;
  inStock: number;
  outOfStock: number;
  negative: number;
  belowMinimum: number;
};

// --- Mapper: database -> miền ----------------------------------------------

function isDocumentKind(value: string): value is DocumentKind {
  return value === "XUAT" || value === "TRA_NCC";
}

/**
 * `nhip_ban` luôn trả đúng hai dòng, ngày mới trước (0071). Sắp lại theo `ngay`
 * giảm dần cho chắc thay vì tin thứ tự SQL, rồi tách today/yesterday theo vị
 * trí — thiếu dòng (không nên xảy ra với RPC này) thì báo lỗi rõ ràng thay vì
 * để `undefined` rò ra tới component.
 */
export function toSalesPace(rows: SalesPaceRowDb[]): SalesPace {
  const sorted = [...rows].sort((a, b) => (a.ngay < b.ngay ? 1 : -1));
  const [today, yesterday] = sorted;
  if (!today || !yesterday) {
    throw new Error(
      "Nhịp bán: RPC nhip_ban phải trả đúng hai dòng (hôm nay, hôm qua)",
    );
  }

  const toDay = (row: SalesPaceRowDb): SalesPaceDay => ({
    date: row.ngay,
    documentCount: Number(row.so_phieu),
    lineCount: Number(row.so_dong),
    productCount: Number(row.so_ma),
  });

  return { today: toDay(today), yesterday: toDay(yesterday) };
}

export function toNegativeStockLine(row: NegativeStockRowDb): NegativeStockLine {
  return {
    key: row.dong_id,
    documentId: row.chung_tu_id,
    documentNumber: row.so_ct,
    documentKind: isDocumentKind(row.loai_ct) ? row.loai_ct : "XUAT",
    warehouseName: row.ten_kho,
    productId: row.san_pham_id,
    productCode: row.ma_hang,
    productName: row.ten_hang,
    issuedQuantity: Number(row.so_luong_xuat),
    balanceAfter: Number(row.ton_sau),
    createdBy: row.nguoi_lap,
    reasonCode: row.ly_do_xuat_am,
    reasonNote: row.ghi_chu_ly_do,
  };
}

export function toStockByGroupRow(row: StockByGroupRowDb): StockByGroupRow {
  return {
    key: row.nhom_id ?? "__none__",
    groupId: row.nhom_id,
    groupName: row.ten_nhom,
    total: Number(row.tong_ma),
    inStock: Number(row.con_hang),
    outOfStock: Number(row.het_hang),
    negative: Number(row.am),
    belowMinimum: Number(row.duoi_dinh_muc),
  };
}
