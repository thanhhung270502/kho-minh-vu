import { readDate, readUuid } from "@/features/documents/lib/url-filter";
import type { Database } from "@/types/database.types";

import type { DocStatus, ReceiptSource } from "../types";

export {
  documentHeaderSchema,
  documentLineSchema,
  toDocumentLineUpdate,
  toDocumentUpdate,
  type DocumentHeaderInput,
  type DocumentLineInput,
} from "@/features/documents/schemas/document.schema";

// --- Bộ lọc trên URL --------------------------------------------------------

export type ReceiptFilter = {
  q: string;
  status: DocStatus | null;
  partnerId: string | null;
  warehouseId: string | null;
  source: ReceiptSource | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
};

export const DEFAULT_RECEIPT_FILTER: ReceiptFilter = {
  q: "",
  status: null,
  partnerId: null,
  warehouseId: null,
  source: null,
  fromDate: null,
  toDate: null,
  page: 1,
};

export const RECEIPT_PAGE_SIZE = 50;

const STATUSES: DocStatus[] = ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"];
const SOURCES: ReceiptSource[] = ["NCC", "NHA_MAY"];

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm (ô tìm nằm ngoài panel). */
export function countActiveReceiptFilters(filter: ReceiptFilter): number {
  let count = 0;
  if (filter.status !== null) count++;
  if (filter.partnerId !== null) count++;
  if (filter.warehouseId !== null) count++;
  if (filter.source !== null) count++;
  if (filter.fromDate !== null || filter.toDate !== null) count++;
  return count;
}

export function readReceiptFilterFromUrl(params: {
  get(k: string): string | null;
}): ReceiptFilter {
  const status = params.get("trang_thai");
  const source = params.get("nguon");
  // `Number(null)` là 0 chứ không phải NaN — phải chặn trước khi Number().
  const rawPage = params.get("trang");
  const page = rawPage === null || rawPage.trim() === "" ? 1 : Number(rawPage);

  return {
    q: params.get("q")?.trim() ?? "",
    status: STATUSES.includes(status as DocStatus) ? (status as DocStatus) : null,
    partnerId: readUuid(params.get("ncc")),
    warehouseId: readUuid(params.get("kho")),
    source: SOURCES.includes(source as ReceiptSource)
      ? (source as ReceiptSource)
      : null,
    fromDate: readDate(params.get("tu_ngay")),
    toDate: readDate(params.get("den_ngay")),
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1,
  };
}

export function writeReceiptFilterToUrl(filter: ReceiptFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("trang_thai", filter.status);
  if (filter.partnerId) params.set("ncc", filter.partnerId);
  if (filter.warehouseId) params.set("kho", filter.warehouseId);
  if (filter.source) params.set("nguon", filter.source);
  if (filter.fromDate) params.set("tu_ngay", filter.fromDate);
  if (filter.toDate) params.set("den_ngay", filter.toDate);
  if (filter.page !== 1) params.set("trang", String(filter.page));
  return params;
}

type ListArgs = Database["public"]["Functions"]["danh_sach_chung_tu"]["Args"];

export function toReceiptListRpcArgs(filter: ReceiptFilter): ListArgs {
  return {
    p_loai_ct: "NHAP",
    p_trang_thai: filter.status ?? undefined,
    p_doi_tac_id: filter.partnerId ?? undefined,
    p_kho_id: filter.warehouseId ?? undefined,
    p_nguon_nhap: filter.source ?? undefined,
    p_tu_ngay: filter.fromDate ?? undefined,
    p_den_ngay: filter.toDate ?? undefined,
    p_tu_khoa: filter.q || undefined,
    p_trang: filter.page,
    p_kich_thuoc: RECEIPT_PAGE_SIZE,
  };
}
