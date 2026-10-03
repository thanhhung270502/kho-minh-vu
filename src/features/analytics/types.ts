import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];
type Tables = Database["public"]["Tables"];

// --- Hàng thô (khóa snake_case) — chỉ lớp api chạm tới ----------------------
type AnalysisRowDb = Fn["phan_tich_ton_kho"]["Returns"][number];
type SalesDayDb = Fn["nhip_ban_theo_ngay"]["Returns"][number];
type SettingsDb = Tables["cau_hinh_phan_tich"]["Row"];

/** Loại hoàn thiện = mã công đoạn (0018); mọi mã khác (MUA_NGOAI…) gộp "Khác". */
export const FINISH_TYPES = ["EP", "SON", "CARBON", "XI_MA", "NANO", "KHAC"] as const;
export type FinishType = (typeof FINISH_TYPES)[number];

export const FINISH_LABELS: Record<FinishType, string> = {
  EP: "Ép",
  SON: "Sơn",
  CARBON: "Carbon",
  XI_MA: "Xi mạ",
  NANO: "Nano",
  KHAC: "Khác",
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export type AnalysisRow = {
  productId: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  finish: FinishType;
  unitName: string | null;
  stock: number;
  customerOrdered: number;
  /** Tồn − đơn đặt — có thể âm. */
  available: number;
  soldInPeriod: number;
  soldFirstHalf: number;
  soldSecondHalf: number;
  /** Số ngày thật dùng để chia: = kỳ, hoặc ít hơn khi hệ chưa chạy đủ kỳ. */
  effectiveDays: number;
  /** null = không bán trong kỳ. */
  avgDailySales: number | null;
  daysOfCover: number | null;
  stockoutDate: string | null;
  minStock: number;
  lastSaleDate: string | null;
};

export type SalesDay = { date: string; invoiceCount: number; quantity: number };

export type AnalysisSettings = {
  /** Còn <= số ngày này: đỏ, cần nhập ngay. */
  redDays: number;
  /** Còn <= số ngày này: vàng — đồng thời là X của "Sắp hết ≤ X ngày". */
  yellowDays: number;
  /** Y: nhập đủ bán bao nhiêu ngày. */
  coverDays: number;
};

function isFinishType(value: string): value is FinishType {
  return (FINISH_TYPES as readonly string[]).includes(value);
}

export function finishFromStageCode(code: string | null): FinishType {
  return code && isFinishType(code) && code !== "KHAC" ? code : "KHAC";
}

const num = (value: number | string | null) => (value === null ? null : Number(value));

/** PostgREST trả numeric dạng chuỗi và null dù type sinh tự động khai `number`/`string`. */
export function toAnalysisRow(row: AnalysisRowDb): AnalysisRow {
  return {
    productId: row.san_pham_id,
    code: row.ma_hang,
    name: row.ten_hang,
    categoryId: row.nhom_hang_id ?? null,
    categoryName: row.ten_nhom_hang ?? null,
    finish: finishFromStageCode(row.cong_doan_ma ?? null),
    unitName: row.ten_dvt ?? null,
    stock: Number(row.ton),
    customerOrdered: Number(row.khach_dat),
    available: Number(row.ton_kha_dung),
    soldInPeriod: Number(row.ban_trong_ky),
    soldFirstHalf: Number(row.ban_nua_dau),
    soldSecondHalf: Number(row.ban_nua_sau),
    effectiveDays: Number(row.so_ngay_thuc),
    avgDailySales: num(row.ban_tb_ngay ?? null),
    daysOfCover: num(row.so_ngay_con ?? null),
    stockoutDate: row.ngay_het_du_kien ?? null,
    minStock: Number(row.ton_toi_thieu),
    lastSaleDate: row.ngay_ban_cuoi ?? null,
  };
}

export function toSalesDay(row: SalesDayDb): SalesDay {
  return { date: row.ngay, invoiceCount: Number(row.so_hoa_don), quantity: Number(row.so_luong) };
}

export function toSettings(row: SettingsDb): AnalysisSettings {
  return { redDays: row.nguong_do, yellowDays: row.nguong_vang, coverDays: row.so_ngay_du_tru };
}
