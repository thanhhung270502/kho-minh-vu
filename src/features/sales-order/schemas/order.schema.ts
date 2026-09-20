import { z } from "zod";

import { readDate, readUuid } from "@/features/documents/lib/url-filter";
import type { Database } from "@/types/database.types";

import { ORDER_STATUSES, type OrderStatus } from "../lib/order-status";

// --- Form đầu đơn / dòng đơn ------------------------------------------------
//
// D-03: `partnerId` bắt buộc, `doi_tac_id` giữ NOT NULL — không có ô text tự
// do. Đơn KHÔNG mang giá (chốt 19/09 câu 7): không có trường giá ở đây.

export const orderHeaderSchema = z.object({
  partnerId: z.string().uuid("Chọn đối tác"),
  orderDate: z.string().min(1, "Chọn ngày").optional(),
  deliveryDate: z
    .string()
    .nullable()
    .transform((value) => value || null),
  note: z
    .string()
    .trim()
    .nullable()
    .transform((value) => value || null),
});

export const orderLineSchema = z.object({
  productId: z.string().uuid("Chọn mã hàng"),
  quantity: z.coerce
    .number({ message: "Số lượng phải là số" })
    .positive("Số lượng phải lớn hơn 0"),
});

export type OrderHeaderInput = z.input<typeof orderHeaderSchema>;
export type OrderLineInput = z.infer<typeof orderLineSchema>;

type OrderUpdate = Database["public"]["Tables"]["don_dat_hang"]["Update"];
type OrderLineUpdate = Partial<
  Database["public"]["Tables"]["don_dat_hang_dong"]["Update"]
>;

/** Ranh giới duy nhất đổi khóa miền sang tên cột `don_dat_hang`. */
export function toOrderUpdate(input: Partial<OrderHeaderInput>): OrderUpdate {
  const update: OrderUpdate = {};
  if (input.partnerId !== undefined) update.doi_tac_id = input.partnerId;
  if (input.deliveryDate !== undefined) {
    update.ngay_giao_du_kien = input.deliveryDate;
  }
  if (input.note !== undefined) update.ghi_chu = input.note;
  return update;
}

/** Ranh giới duy nhất đổi khóa miền sang tên cột `don_dat_hang_dong`. */
export function toOrderLineUpdate(
  input: Partial<OrderLineInput>,
): OrderLineUpdate {
  const update: OrderLineUpdate = {};
  if (input.productId !== undefined) update.san_pham_id = input.productId;
  if (input.quantity !== undefined) update.so_luong_dat = input.quantity;
  return update;
}

// --- Bộ lọc trên URL ---------------------------------------------------------
//
// `/dat-hang?q=&trang_thai=&doi_tac=&tu_ngay=&den_ngay=&trang=` — khác tham số
// của màn nhập (`ncc`, `kho`, `nguon`): đơn không có kho, không có nguồn nhập.

export type OrderFilter = {
  q: string;
  status: OrderStatus | null;
  partnerId: string | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
};

export const DEFAULT_ORDER_FILTER: OrderFilter = {
  q: "",
  status: null,
  partnerId: null,
  fromDate: null,
  toDate: null,
  page: 1,
};

export const ORDER_PAGE_SIZE = 50;

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm (ô tìm nằm ngoài panel). */
export function countActiveOrderFilters(filter: OrderFilter): number {
  let count = 0;
  if (filter.status !== null) count++;
  if (filter.partnerId !== null) count++;
  if (filter.fromDate !== null || filter.toDate !== null) count++;
  return count;
}

export function readOrderFilterFromUrl(params: {
  get(k: string): string | null;
}): OrderFilter {
  const status = params.get("trang_thai");
  // `Number(null)` là 0 chứ không phải NaN — phải chặn trước khi Number().
  const rawPage = params.get("trang");
  const page = rawPage === null || rawPage.trim() === "" ? 1 : Number(rawPage);

  return {
    q: params.get("q")?.trim() ?? "",
    status: ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : null,
    partnerId: readUuid(params.get("doi_tac")),
    fromDate: readDate(params.get("tu_ngay")),
    toDate: readDate(params.get("den_ngay")),
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1,
  };
}

export function writeOrderFilterToUrl(filter: OrderFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("trang_thai", filter.status);
  if (filter.partnerId) params.set("doi_tac", filter.partnerId);
  if (filter.fromDate) params.set("tu_ngay", filter.fromDate);
  if (filter.toDate) params.set("den_ngay", filter.toDate);
  if (filter.page !== 1) params.set("trang", String(filter.page));
  return params;
}

type OrderListArgs = Database["public"]["Functions"]["danh_sach_don"]["Args"];

/** Viết riêng — tham số của `danh_sach_don` khác `danh_sach_chung_tu` của màn nhập. */
export function toOrderListRpcArgs(filter: OrderFilter): OrderListArgs {
  return {
    p_trang_thai: filter.status ?? undefined,
    p_doi_tac_id: filter.partnerId ?? undefined,
    p_tu_ngay: filter.fromDate ?? undefined,
    p_den_ngay: filter.toDate ?? undefined,
    p_tu_khoa: filter.q || undefined,
    p_trang: filter.page,
    p_kich_thuoc: ORDER_PAGE_SIZE,
  };
}
