// File thuần (bẫy 9): schema bộ lọc của nhập/xuất và component client cùng import.
import type { DocStatus } from "../types";

/** Thứ tự hiển thị trong bộ lọc — trùng thứ tự enum `trang_thai_ct`. */
export const DOC_STATUSES: DocStatus[] = ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"];

/** Giống Đơn đặt: mặc định tích mọi trạng thái trừ Đã hủy — phiếu hủy ẩn, tích vào mới hiện. */
export const DEFAULT_DOC_STATUSES: DocStatus[] = DOC_STATUSES.filter((s) => s !== "DA_HUY");

export function isDefaultDocStatuses(statuses: readonly DocStatus[]): boolean {
  return (
    statuses.length === DEFAULT_DOC_STATUSES.length &&
    DEFAULT_DOC_STATUSES.every((s) => statuses.includes(s))
  );
}

/**
 * `?trang_thai=NHAP_LIEU,HOAN_THANH`. Bookmark cũ chỉ có một giá trị vẫn đọc được.
 * Thiếu hoặc không giá trị nào hợp lệ → mặc định (bảng trống vì URL hỏng là vô nghĩa).
 */
export function readDocStatuses(raw: string | null): DocStatus[] {
  if (raw === null) return DEFAULT_DOC_STATUSES;
  const picked = new Set(raw.split(","));
  const statuses = DOC_STATUSES.filter((s) => picked.has(s));
  return statuses.length > 0 ? statuses : DEFAULT_DOC_STATUSES;
}

/** Mặc định thì không ghi lên URL. */
export function writeDocStatuses(statuses: readonly DocStatus[]): string | null {
  return isDefaultDocStatuses(statuses) ? null : statuses.join(",");
}

/** Tích đủ mọi trạng thái = không lọc — khỏi bắt database so khớp vô ích. */
export function docStatusesToRpc(statuses: readonly DocStatus[]): DocStatus[] | undefined {
  return statuses.length === DOC_STATUSES.length ? undefined : [...statuses];
}

/** Bật/tắt một trạng thái, giữ đúng thứ tự DOC_STATUSES. Bỏ ô cuối cùng thì trả null (giữ ít nhất một). */
export function toggleDocStatus(selected: readonly DocStatus[], status: DocStatus): DocStatus[] | null {
  const next = selected.includes(status)
    ? selected.filter((s) => s !== status)
    : DOC_STATUSES.filter((s) => s === status || selected.includes(s));
  return next.length > 0 ? next : null;
}
