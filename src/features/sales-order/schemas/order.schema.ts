import { z } from "zod";

import { readDate, readUuid } from "@/features/documents/lib/url-filter";
import type { RecipientKind } from "@/shared/lib/recipient";
import type { Database } from "@/types/database.types";

import { ORDER_STATUSES, type OrderStatus } from "../lib/order-status";

// --- Form đầu đơn / dòng đơn ------------------------------------------------
//
// D-03: người nhận bắt buộc, không có ô text tự do. Từ 0076 người nhận là
// đối tác HOẶC nhân viên nội bộ — database ép đúng một (ck_ddh_mot_nguoi_nhan).
// Đơn KHÔNG mang giá (chốt 19/09 câu 7): không có trường giá ở đây.

export const recipientChoiceSchema = z.object({
  kind: z.enum(["partner", "internal"]),
  id: z.string().uuid("Chọn người nhận"),
});

export const orderHeaderSchema = z.object({
  recipient: recipientChoiceSchema,
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
  if (input.recipient !== undefined) {
    // Ghi CẢ HAI cột mỗi lần đổi người nhận: đổi chế độ mà quên xóa cột kia
    // là vướng CHECK ngay.
    update.doi_tac_id =
      input.recipient.kind === "partner" ? input.recipient.id : null;
    update.nguoi_nhan_id =
      input.recipient.kind === "internal" ? input.recipient.id : null;
  }
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
// `/don-dat?q=&trang_thai=&nguoi_nhan=&doi_tac=&tu_ngay=&den_ngay=&trang=` — khác tham số
// của màn nhập (`ncc`, `kho`, `nguon`): đơn không có kho, không có nguồn nhập.

export type OrderFilter = {
  q: string;
  status: OrderStatus | null;
  recipientKind: RecipientKind | null;
  partnerId: string | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
};

export const DEFAULT_ORDER_FILTER: OrderFilter = {
  q: "",
  status: null,
  recipientKind: null,
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
  if (filter.recipientKind !== null) count++;
  if (filter.partnerId !== null) count++;
  if (filter.fromDate !== null || filter.toDate !== null) count++;
  return count;
}

// URL tiếng Việt không dấu (CLAUDE.md), domain tiếng Anh, RPC giữ giá trị của
// database — ba bảng tra một chiều, không suy từ nhau.
const RECIPIENT_KIND_FROM_URL: Record<string, RecipientKind> = {
  doi_tac: "partner",
  noi_bo: "internal",
};
const RECIPIENT_KIND_TO_URL: Record<RecipientKind, string> = {
  partner: "doi_tac",
  internal: "noi_bo",
};
// Hợp đồng với `danh_sach_don.p_loai_nhan` (0076).
const RECIPIENT_KIND_TO_RPC: Record<RecipientKind, string> = {
  partner: "DOI_TAC",
  internal: "NOI_BO",
};

function readRecipientKind(raw: string | null): RecipientKind | null {
  // hasOwn: chặn "?nguoi_nhan=toString" lấy nhầm hàm của prototype.
  return raw !== null && Object.hasOwn(RECIPIENT_KIND_FROM_URL, raw)
    ? RECIPIENT_KIND_FROM_URL[raw]
    : null;
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
    recipientKind: readRecipientKind(params.get("nguoi_nhan")),
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
  if (filter.recipientKind) {
    params.set("nguoi_nhan", RECIPIENT_KIND_TO_URL[filter.recipientKind]);
  }
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
    p_loai_nhan: filter.recipientKind
      ? RECIPIENT_KIND_TO_RPC[filter.recipientKind]
      : undefined,
  };
}
