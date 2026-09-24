import { z } from "zod";

import type { Database } from "@/types/database.types";

export type KiotVietHistoryType = "" | "NHAP" | "XUAT";

export type KiotVietHistoryFilter = {
  type: KiotVietHistoryType;
  from: string;
  to: string;
  keyword: string;
  voucherNo: string;
  productCode: string;
  page: number;
  pageSize: number;
};

export const DEFAULT_HISTORY_FILTER: KiotVietHistoryFilter = {
  type: "",
  from: "",
  to: "",
  keyword: "",
  voucherNo: "",
  productCode: "",
  page: 1,
  pageSize: 50,
};

/** Ánh xạ trường bộ lọc sang tham số URL tiếng Việt không dấu — bề mặt người dùng. */
const HISTORY_URL_PARAMS = {
  type: "loai",
  from: "tu_ngay",
  to: "den_ngay",
  keyword: "tim",
  voucherNo: "so_phieu",
  productCode: "ma_hang",
  page: "trang",
} as const;

const DATE_FORMAT = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function readDate(value: string | null): string {
  if (!value) return "";
  return DATE_FORMAT.safeParse(value).success ? value : "";
}

/** URL là nguồn sự thật của bộ lọc: refresh hay gửi link đều giữ nguyên điều kiện. */
export function readHistoryFilterFromUrl(
  params: URLSearchParams | { get(k: string): string | null },
): KiotVietHistoryFilter {
  const readInt = (key: string, fallback: number, min: number, max: number) => {
    // `Number(null)` là 0 chứ không phải NaN — thiếu bước này thì khóa vắng mặt
    // bị kẹp về `min` thay vì lấy giá trị mặc định.
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Math.max(Math.trunc(parsed), min), max);
  };

  const type = params.get(HISTORY_URL_PARAMS.type);

  return {
    type: type === "NHAP" || type === "XUAT" ? type : "",
    from: readDate(params.get(HISTORY_URL_PARAMS.from)),
    to: readDate(params.get(HISTORY_URL_PARAMS.to)),
    keyword: params.get(HISTORY_URL_PARAMS.keyword)?.trim() ?? "",
    voucherNo: params.get(HISTORY_URL_PARAMS.voucherNo)?.trim() ?? "",
    productCode: params.get(HISTORY_URL_PARAMS.productCode)?.trim() ?? "",
    page: readInt(HISTORY_URL_PARAMS.page, 1, 1, 100_000),
    pageSize: DEFAULT_HISTORY_FILTER.pageSize,
  };
}

/** Chỉ ghi khóa khác mặc định để URL gọn và dễ đọc. */
export function writeHistoryFilterToUrl(filter: KiotVietHistoryFilter): string {
  const params = new URLSearchParams();
  if (filter.type) params.set(HISTORY_URL_PARAMS.type, filter.type);
  if (filter.from) params.set(HISTORY_URL_PARAMS.from, filter.from);
  if (filter.to) params.set(HISTORY_URL_PARAMS.to, filter.to);
  if (filter.keyword) params.set(HISTORY_URL_PARAMS.keyword, filter.keyword);
  if (filter.voucherNo) params.set(HISTORY_URL_PARAMS.voucherNo, filter.voucherNo);
  if (filter.productCode) {
    params.set(HISTORY_URL_PARAMS.productCode, filter.productCode);
  }
  if (filter.page !== DEFAULT_HISTORY_FILTER.page) {
    params.set(HISTORY_URL_PARAMS.page, String(filter.page));
  }
  return params.toString();
}

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm kiếm (ô tìm nằm ngoài panel). */
export function countActiveHistoryFilters(filter: KiotVietHistoryFilter): number {
  let count = 0;
  if (filter.type) count++;
  if (filter.from) count++;
  if (filter.to) count++;
  if (filter.voucherNo) count++;
  if (filter.productCode) count++;
  return count;
}

type HistoryRpcArgs =
  Database["public"]["Functions"]["tra_cuu_lich_su_kiotviet"]["Args"];

export function toHistoryRpcArgs(
  filter: KiotVietHistoryFilter,
  extra?: { productId?: string },
): HistoryRpcArgs {
  return {
    p_loai: filter.type || undefined,
    p_tu_khoa: filter.keyword.trim() || undefined,
    p_ma_hang: filter.productCode.trim() || undefined,
    p_san_pham_id: extra?.productId || undefined,
    p_so_phieu: filter.voucherNo.trim() || undefined,
    p_tu_ngay: filter.from || undefined,
    p_den_ngay: filter.to || undefined,
    p_trang: filter.page,
    p_kich_thuoc: filter.pageSize,
  };
}
