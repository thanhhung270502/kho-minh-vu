import { z } from "zod";

import {
  DEFAULT_DOC_STATUSES,
  docStatusesToRpc,
  isDefaultDocStatuses,
  readDocStatuses,
  writeDocStatuses,
} from "@/features/documents/lib/status-filter";
import { readDate, readUuid } from "@/features/documents/lib/url-filter";
import { isDefaultDateRange, readDateRangeOrThisMonth } from "@/shared/lib/date-presets";
import type { Database } from "@/types/database.types";

import type { DocStatus } from "../types";

export {
  documentHeaderSchema,
  documentLineSchema,
  negativeReasonSchema,
  toDocumentLineUpdate,
  toDocumentUpdate,
  type DocumentHeaderInput,
  type DocumentLineInput,
  type NegativeReasonInput,
} from "@/features/documents/schemas/document.schema";

// --- Bộ lọc trên URL (`/duyet-don`) -------------------------------------------
// Không lọc theo kho: kho ẩn trên hóa đơn (04/10/2026). `?kho=` của bookmark cũ
// bị bỏ qua — giữ lại thì danh sách lọc ngầm mà không có ô nào để gỡ.

export type IssueFilter = {
  q: string;
  /** Trạng thái được tích — luôn ít nhất một; mặc định ẩn Đã hủy (giống Đơn đặt, 0138). */
  statuses: DocStatus[];
  partnerId: string | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
};

export const DEFAULT_ISSUE_FILTER: IssueFilter = {
  q: "",
  statuses: DEFAULT_DOC_STATUSES,
  partnerId: null,
  fromDate: null,
  toDate: null,
  page: 1,
};

export const ISSUE_PAGE_SIZE = 50;

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm (ô tìm nằm ngoài panel). */
export function countActiveIssueFilters(filter: IssueFilter): number {
  let count = 0;
  if (!isDefaultDocStatuses(filter.statuses)) count++;
  if (filter.partnerId !== null) count++;
  // Mặc định tháng này không tính là đang lọc.
  if ((filter.fromDate !== null || filter.toDate !== null) && !isDefaultDateRange(filter.fromDate, filter.toDate)) count++;
  return count;
}

export function readIssueFilterFromUrl(params: {
  get(k: string): string | null;
}): IssueFilter {
  // `Number(null)` là 0 chứ không phải NaN — phải chặn trước khi Number().
  const rawPage = params.get("trang");
  const page = rawPage === null || rawPage.trim() === "" ? 1 : Number(rawPage);

  return {
    q: params.get("q")?.trim() ?? "",
    statuses: readDocStatuses(params.get("trang_thai")),
    partnerId: readUuid(params.get("doi_tac")),
    // URL chưa chọn ngày → tháng này.
    ...readDateRangeOrThisMonth(params, readDate),
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1,
  };
}

export function writeIssueFilterToUrl(filter: IssueFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  const statuses = writeDocStatuses(filter.statuses);
  if (statuses) params.set("trang_thai", statuses);
  if (filter.partnerId) params.set("doi_tac", filter.partnerId);
  // Tháng này là mặc định — không ghi lên URL để link lưu lại vẫn "tháng này" khi sang tháng.
  if (!isDefaultDateRange(filter.fromDate, filter.toDate)) {
    if (filter.fromDate) params.set("tu_ngay", filter.fromDate);
    if (filter.toDate) params.set("den_ngay", filter.toDate);
  }
  if (filter.page !== 1) params.set("trang", String(filter.page));
  return params;
}

type ListArgs = Database["public"]["Functions"]["danh_sach_chung_tu"]["Args"];

/** Chiều xuất không có trục nguồn nhập — cố ý không truyền đối số đó. */
export function toIssueListRpcArgs(filter: IssueFilter): ListArgs {
  return {
    p_loai_ct: "XUAT",
    p_trang_thai: docStatusesToRpc(filter.statuses),
    p_doi_tac_id: filter.partnerId ?? undefined,
    p_tu_ngay: filter.fromDate ?? undefined,
    p_den_ngay: filter.toDate ?? undefined,
    p_tu_khoa: filter.q || undefined,
    p_trang: filter.page,
    p_kich_thuoc: ISSUE_PAGE_SIZE,
  };
}

type CountArgs = Database["public"]["Functions"]["dem_chung_tu_theo_trang_thai"]["Args"];

/** Số đếm cạnh ô trạng thái: đúng bộ lọc của danh sách trừ trạng thái và trang — tích ô hay sang trang không đếm lại. */
export function toIssueStatusCountRpcArgs(filter: IssueFilter): CountArgs {
  return {
    p_loai_ct: "XUAT",
    p_doi_tac_id: filter.partnerId ?? undefined,
    p_tu_ngay: filter.fromDate ?? undefined,
    p_den_ngay: filter.toDate ?? undefined,
    p_tu_khoa: filter.q || undefined,
  };
}

// --- Tạo phiếu xuất không cần đơn (XUAT-02) -----------------------------------

/** KHÔNG dùng z.coerce.number(): InputNumber của antd đã trả number|null (bẫy 11). */
export const newIssueSchema = z.object({
  partnerId: z.string().uuid("Chọn khách hàng"),
  warehouseId: z.string().uuid("Chọn kho"),
  docDate: z.string().min(1).optional(),
});

export type NewIssueInput = z.infer<typeof newIssueSchema>;
