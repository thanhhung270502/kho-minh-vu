import { z } from "zod";

import type { Database } from "@/types/database.types";

/**
 * Giá trị đi THẲNG xuống RPC `p_trang_thai_ton` — là hợp đồng với database,
 * giữ nguyên chuỗi tiếng Việt.
 */
export const STOCK_STATUSES = [
  "con_hang",
  "het_hang",
  "am",
  "duoi_dinh_muc",
] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const SORT_FIELDS = ["code", "name", "totalStock", "updatedAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/** Tên cột database cho `p_sap_xep`, đồng thời là giá trị của tham số URL `sap_xep`. */
const SORT_FIELD_TO_COLUMN: Record<SortField, string> = {
  code: "ma_hang",
  name: "ten_hang",
  totalStock: "tong_ton",
  updatedAt: "updated_at",
};

const COLUMN_TO_SORT_FIELD: Record<string, SortField> = Object.fromEntries(
  Object.entries(SORT_FIELD_TO_COLUMN).map(([field, column]) => [column, field]),
) as Record<string, SortField>;

export type TradingStatus = "active" | "inactive" | "all";

/** Giá trị của tham số URL `kinh_doanh` — bề mặt người dùng, giữ tiếng Việt. */
const TRADING_STATUS_TO_URL: Record<TradingStatus, string> = {
  active: "dang",
  inactive: "ngung",
  all: "tat_ca",
};

const URL_TO_TRADING_STATUS: Record<string, TradingStatus> = {
  dang: "active",
  ngung: "inactive",
  tat_ca: "all",
};

export type ProductFilter = {
  q: string;
  categoryId: string | null;
  stageId: string | null;
  unitId: string | null;
  stockStatus: StockStatus | null;
  tradingStatus: TradingStatus;
  needsReview: boolean;
  sortBy: SortField | null;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export const DEFAULT_PRODUCT_FILTER: ProductFilter = {
  q: "",
  categoryId: null,
  stageId: null,
  unitId: null,
  stockStatus: null,
  tradingStatus: "active",
  needsReview: false,
  sortBy: null,
  sortDir: "asc",
  page: 1,
  pageSize: 50,
};

export const PAGE_SIZES = [20, 50, 100, 200] as const;

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm kiếm (ô tìm nằm ngoài panel). */
export function countActiveFilters(filter: ProductFilter): number {
  let count = 0;
  if (filter.categoryId !== null) count++;
  if (filter.stageId !== null) count++;
  if (filter.unitId !== null) count++;
  if (filter.stockStatus !== null) count++;
  if (filter.needsReview) count++;
  if (filter.tradingStatus !== DEFAULT_PRODUCT_FILTER.tradingStatus) count++;
  return count;
}

const uuid = z.string().uuid();

function readUuid(value: string | null): string | null {
  return value && uuid.safeParse(value).success ? value : null;
}

/** URL là nguồn sự thật của bộ lọc: refresh hay gửi link đều giữ nguyên (D-11). */
export function readFilterFromUrl(
  params: URLSearchParams | { get(k: string): string | null },
): ProductFilter {
  const readInt = (key: string, fallback: number, min: number, max: number) => {
    // `Number(null)` là 0 chứ không phải NaN — thiếu bước này thì khóa vắng mặt
    // bị kẹp về `min` thay vì lấy giá trị mặc định.
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Math.max(Math.trunc(parsed), min), max);
  };

  const stock = params.get("ton");
  const sort = params.get("sap_xep");
  const trading = params.get("kinh_doanh");
  const direction = params.get("sortDir");

  return {
    q: params.get("q")?.trim() ?? "",
    categoryId: readUuid(params.get("nhom")),
    stageId: readUuid(params.get("cong_doan")),
    unitId: readUuid(params.get("dvt")),
    stockStatus: STOCK_STATUSES.includes(stock as StockStatus)
      ? (stock as StockStatus)
      : null,
    tradingStatus:
      (trading ? URL_TO_TRADING_STATUS[trading] : undefined) ??
      DEFAULT_PRODUCT_FILTER.tradingStatus,
    needsReview: params.get("can_ra") === "1",
    sortBy: (sort ? COLUMN_TO_SORT_FIELD[sort] : undefined) ?? null,
    sortDir: direction === "desc" ? "desc" : "asc",
    page: readInt("trang", 1, 1, 100_000),
    pageSize: readInt("kich_thuoc", DEFAULT_PRODUCT_FILTER.pageSize, 10, 200),
  };
}

/** Chỉ ghi khóa khác mặc định để URL gọn và dễ đọc. */
export function writeFilterToUrl(filter: ProductFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.categoryId) params.set("nhom", filter.categoryId);
  if (filter.stageId) params.set("cong_doan", filter.stageId);
  if (filter.unitId) params.set("dvt", filter.unitId);
  if (filter.stockStatus) params.set("ton", filter.stockStatus);
  if (filter.tradingStatus !== DEFAULT_PRODUCT_FILTER.tradingStatus) {
    params.set("kinh_doanh", TRADING_STATUS_TO_URL[filter.tradingStatus]);
  }
  if (filter.needsReview) params.set("can_ra", "1");
  if (filter.sortBy) params.set("sap_xep", SORT_FIELD_TO_COLUMN[filter.sortBy]);
  if (filter.sortDir !== DEFAULT_PRODUCT_FILTER.sortDir) {
    params.set("sortDir", filter.sortDir);
  }
  if (filter.page !== DEFAULT_PRODUCT_FILTER.page) {
    params.set("trang", String(filter.page));
  }
  if (filter.pageSize !== DEFAULT_PRODUCT_FILTER.pageSize) {
    params.set("kich_thuoc", String(filter.pageSize));
  }
  return params;
}

type ListArgs = Database["public"]["Functions"]["danh_sach_san_pham"]["Args"];

export function toListRpcArgs(filter: ProductFilter): ListArgs {
  const args: ListArgs = {
    p_tu_khoa: filter.q || undefined,
    p_nhom_hang_id: filter.categoryId ?? undefined,
    p_cong_doan_id: filter.stageId ?? undefined,
    p_dvt_id: filter.unitId ?? undefined,
    p_trang_thai_ton: filter.stockStatus ?? undefined,
    p_dang_kinh_doanh: filter.tradingStatus === "active",
    p_can_ra: filter.needsReview ? true : undefined,
    p_sap_xep: filter.sortBy ? SORT_FIELD_TO_COLUMN[filter.sortBy] : undefined,
    p_huong: filter.sortDir,
    p_trang: filter.page,
    p_kich_thuoc: filter.pageSize,
  };

  if (filter.tradingStatus === "all") {
    // "Tất cả" phải gửi null TƯỜNG MINH. Bỏ trường đi thì RPC dùng mặc định
    // `p_dang_kinh_doanh = true` và màn hình lặng lẽ giấu mã đã ngừng kinh doanh.
    (args as Record<string, unknown>).p_dang_kinh_doanh = null;
  }

  return args;
}
