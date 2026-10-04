import { toStaffRefs, type OrderRecipients } from "@/shared/lib/recipient";
import type { Database } from "@/types/database.types";

import { ORDER_STATUSES, type OrderStatus } from "./lib/order-status";

type Fn = Database["public"]["Functions"];

type OrderRowDb = Fn["danh_sach_don"]["Returns"][number];
type OrderDetailDb = Fn["chi_tiet_don"]["Returns"][number];
type OrderLineDb = Fn["dong_don"]["Returns"][number];
type StatusCountDb = Fn["dem_don_theo_trang_thai"]["Returns"][number];
type AddLineDb = Fn["them_dong_don"]["Returns"][number];

/**
 * Đơn đặt hàng KHÔNG mang giá (chốt 19/09 câu 7) — ba kiểu dưới đây không có
 * field đơn giá hay thành tiền nào cả.
 */
export type OrderRow = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  recipients: OrderRecipients;
  lineCount: number;
  orderedQuantity: number;
  shippedQuantity: number;
  createdByName: string | null;
  note: string | null;
  createdAt: string;
  totalRows: number;
};

export type OrderDetail = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  recipients: OrderRecipients;
  createdByName: string | null;
  note: string | null;
  orderedQuantity: number;
  shippedQuantity: number;
  createdAt: string;
  /** Hóa đơn (XUAT chưa hủy) sinh khi Hoàn thành đơn — tối đa một (0078). */
  invoice: { id: string; number: string } | null;
};

export type OrderLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string | null;
  orderedQuantity: number;
  shippedQuantity: number;
  /** D-04: tính TRONG mapper này, không lưu ở database hay ở state. */
  remainingQuantity: number;
  /** Người nhận riêng của dòng; null = hàng chung của đơn (0090). */
  recipientId: string | null;
  recipientName: string | null;
  defaultWarehouseId: string | null;
  defaultWarehouseName: string | null;
  createdAt: string;
};

export function toOrderRow(row: OrderRowDb): OrderRow {
  return {
    id: row.id,
    orderNo: row.so_dh,
    orderDate: row.ngay_dh,
    status: row.trang_thai,
    // RPC trả null cho cột không dùng dù type sinh tự động khai `string`.
    recipients: {
      partner: row.doi_tac_id
        ? { id: row.doi_tac_id, code: null, name: row.ten_doi_tac }
        : null,
      staff: toStaffRefs(row.nguoi_nhan_ids, row.ten_nguoi_nhan),
    },
    lineCount: Number(row.so_dong),
    orderedQuantity: Number(row.tong_so_luong_dat),
    shippedQuantity: Number(row.tong_so_luong_da_xuat),
    createdByName: row.ho_ten_nguoi_tao,
    note: row.ghi_chu,
    createdAt: row.created_at,
    totalRows: Number(row.tong_so_dong),
  };
}

export function toOrderDetail(row: OrderDetailDb): OrderDetail {
  return {
    id: row.id,
    orderNo: row.so_dh,
    orderDate: row.ngay_dh,
    status: row.trang_thai,
    recipients: {
      partner: row.doi_tac_id
        ? { id: row.doi_tac_id, code: row.ma_doi_tac, name: row.ten_doi_tac }
        : null,
      staff: toStaffRefs(row.nguoi_nhan_ids, row.ten_nguoi_nhan),
    },
    createdByName: row.ho_ten_nguoi_tao,
    note: row.ghi_chu,
    orderedQuantity: Number(row.tong_so_luong_dat),
    shippedQuantity: Number(row.tong_so_luong_da_xuat),
    createdAt: row.created_at,
    // RPC trả null khi chưa có hóa đơn dù type sinh tự động khai `string`.
    invoice: row.hoa_don_id ? { id: row.hoa_don_id, number: row.so_hoa_don } : null,
  };
}

export function toOrderLine(row: OrderLineDb): OrderLine {
  const orderedQuantity = Number(row.so_luong_dat);
  const shippedQuantity = Number(row.so_luong_da_xuat);
  return {
    id: row.id,
    productId: row.san_pham_id,
    productCode: row.ma_hang,
    productName: row.ten_hang,
    unitName: row.ten_dvt,
    orderedQuantity,
    shippedQuantity,
    // D-04 — "còn lại" tính khi đọc, không lưu cột, không lưu state.
    remainingQuantity: Math.max(0, orderedQuantity - shippedQuantity),
    recipientId: row.nguoi_nhan_id ?? null,
    recipientName: row.ten_nguoi_nhan ?? null,
    defaultWarehouseId: row.kho_mac_dinh_id,
    defaultWarehouseName: row.ten_kho_mac_dinh,
    createdAt: row.created_at,
  };
}

/** Dòng đã giao đủ số đặt — dùng để tô mờ/ẩn nút sửa ở giao diện Wave 9. */
export function isFullyShipped(line: OrderLine): boolean {
  return line.remainingQuantity <= 0;
}

/** Ẩn/hiện ở client — chặn thật nằm ở bốn policy ghi của plan 04-02. */
export type OrderPermissions = {
  /** Tạo/sửa đơn còn ở trạng thái tạm, thêm/sửa/xóa dòng (D-06). */
  canEdit: boolean;
  /** Xác nhận, mở lại đơn đã xác nhận, đóng sớm — quyền chức vụ "Xác nhận". */
  canApprove: boolean;
  /** Hoàn thành đơn (tạo + ghi sổ hóa đơn) — quyền chức vụ "Hoàn thành". */
  canComplete: boolean;
  /** Hủy đơn — theo phạm vi quản trị (huy_don, 0078), không thuộc 9 quyền chức vụ. */
  canCancel: boolean;
};

export type OrderStatusCounts = {
  byStatus: Record<OrderStatus, number>;
  total: number;
};

export function toOrderStatusCounts(rows: StatusCountDb[]): OrderStatusCounts {
  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
  let total = 0;
  for (const row of rows) {
    const count = Number(row.so_don);
    byStatus[row.trang_thai] += count;
    total += count;
  }
  return { byStatus, total };
}

/** Kết quả thêm dòng (0094): merged = cộng dồn vào dòng cùng mã + cùng người nhận (D-03). */
export type AddOrderLineResult = {
  lineId: string;
  merged: boolean;
  quantity: number;
};

export function toAddOrderLineResult(row: AddLineDb): AddOrderLineResult {
  return {
    lineId: row.dong_id,
    merged: row.da_cong_don,
    quantity: Number(row.so_luong_moi),
  };
}
