import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

// --- Hàng thô từ database (khóa snake_case tiếng Việt) ----------------------
// Chỉ lớp api và mapper ở đây được chạm vào các kiểu này. Component và hook
// luôn nhận kiểu đã map (CLAUDE.md Bước 3-4).

type NegativeStockRowDb = Fn["bao_cao_xuat_am"]["Returns"][number];
type StockByGroupRowDb = Fn["ton_theo_nhom"]["Returns"][number];
type OverviewRowDb = Fn["tong_quan_chi_so"]["Returns"][number];
type FlowRowDb = Fn["nhap_xuat_theo_ngay"]["Returns"][number];

// --- Mô hình miền (khóa camelCase tiếng Anh) --------------------------------

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
  totalQuantity: number;
};

export type NegativeByWarehouse = { warehouseName: string; count: number };

export type OverviewKpis = {
  avgIssuesPerDay: number;
  pendingDocs: number;
  pendingReceipts: number;
  pendingIssues: number;
  oldestPendingDays: number | null;
  pendingTrend: number[];
  negativeByWarehouse: NegativeByWarehouse[];
};

export type FlowDay = {
  date: string;
  receiptCount: number;
  issueCount: number;
  receiptQuantity: number;
  issueQuantity: number;
};


// --- Mapper: database -> miền ----------------------------------------------

function isDocumentKind(value: string): value is DocumentKind {
  return value === "XUAT" || value === "TRA_NCC";
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
    totalQuantity: Number(row.tong_so_luong),
  };
}

// `ton_am_theo_kho` là jsonb [{ten_kho, so_ma}] — khóa là hợp đồng với RPC 0093.
function parseNegativeByWarehouse(value: unknown): NegativeByWarehouse[] {
  if (!Array.isArray(value)) return [];
  const result: NegativeByWarehouse[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.ten_kho !== "string") continue;
    result.push({ warehouseName: record.ten_kho, count: Number(record.so_ma) });
  }
  return result;
}

const toNumbers = (values: unknown[] | null): number[] => (values ?? []).map(Number);

export function toOverviewKpis(row: OverviewRowDb): OverviewKpis {
  return {
    avgIssuesPerDay: Number(row.phieu_xuat_tb_ngay),
    pendingDocs: Number(row.cho_ghi_so),
    pendingReceipts: Number(row.cho_ghi_so_nhap),
    pendingIssues: Number(row.cho_ghi_so_xuat),
    oldestPendingDays:
      row.cho_ghi_so_cu_nhat_ngay == null ? null : Number(row.cho_ghi_so_cu_nhat_ngay),
    pendingTrend: toNumbers(row.xu_huong_cho_ghi_so),
    negativeByWarehouse: parseNegativeByWarehouse(row.ton_am_theo_kho),
  };
}

export function toFlowDay(row: FlowRowDb): FlowDay {
  return {
    date: row.ngay,
    receiptCount: Number(row.so_phieu_nhap),
    issueCount: Number(row.so_phieu_xuat),
    receiptQuantity: Number(row.sl_nhap),
    issueQuantity: Number(row.sl_xuat),
  };
}

// --- Hoạt động gần đây (0116) --------------------------------------------------

type ActivityRowDb = Fn["hoat_dong_gan_day"]["Returns"][number];

/** Nhóm lọc — khóa tiếng Anh; ánh xạ sang p_nhom của RPC ở lớp api. */
export type ActivityGroup = "all" | "orders" | "receipts" | "issues" | "other" | "catalog";

export type ActivityKind =
  | "DON_DAT"
  | "NHAP"
  | "XUAT"
  | "TRA_NCC"
  | "TRA_KHACH"
  | "KIEM_KE"
  | "DIEU_CHINH"
  | "CHUYEN_KHO"
  | "SAN_PHAM"
  | "DOI_TAC";

export type ActivityAction = "tao" | "sua" | "xac_nhan" | "mo_khoa" | "hoan_thanh" | "huy" | "ghi_so";

export type ActivityEvent = {
  /** Khóa React: thời điểm + loại + thao tác + đối tượng (một lần gộp nhiều bản ghi không có id). */
  key: string;
  at: string;
  kind: ActivityKind;
  action: ActivityAction;
  /** null khi nhiều bản ghi gộp một sự kiện (count > 1). */
  targetId: string | null;
  code: string | null;
  detail: string | null;
  count: number;
  /** "import" = nhập từ Excel. */
  viaImport: boolean;
  actor: string | null;
};

export function toActivityEvent(row: ActivityRowDb): ActivityEvent {
  // RPC trả null cho cột không có dù type sinh tự động khai `string`.
  const targetId = (row.doi_tuong_id as string | null) ?? null;
  return {
    key: `${row.thoi_gian}|${row.loai}|${row.hanh_dong}|${targetId ?? row.so_luong}`,
    at: row.thoi_gian,
    kind: row.loai as ActivityKind,
    action: row.hanh_dong as ActivityAction,
    targetId,
    code: (row.ma as string | null) ?? null,
    detail: (row.chi_tiet as string | null) ?? null,
    count: Number(row.so_luong),
    viaImport: row.nguon === "import",
    actor: (row.nguoi as string | null) ?? null,
  };
}
