import type { Database } from "@/types/database.types";

import type { OrderStatus } from "./lib/order-status";

type Fn = Database["public"]["Functions"];

type OrderRowDb = Fn["danh_sach_don"]["Returns"][number];
type OrderDetailDb = Fn["chi_tiet_don"]["Returns"][number];
type OrderLineDb = Fn["dong_don"]["Returns"][number];

/**
 * Đơn đặt hàng KHÔNG mang giá (chốt 19/09 câu 7) — ba kiểu dưới đây không có
 * field đơn giá hay thành tiền nào cả.
 */
export type OrderRow = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  deliveryDate: string | null;
  partnerId: string;
  partnerName: string | null;
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
  deliveryDate: string | null;
  partnerId: string;
  partnerCode: string | null;
  partnerName: string | null;
  createdByName: string | null;
  note: string | null;
  orderedQuantity: number;
  shippedQuantity: number;
  createdAt: string;
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
    deliveryDate: row.ngay_giao_du_kien,
    partnerId: row.doi_tac_id,
    partnerName: row.ten_doi_tac,
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
    deliveryDate: row.ngay_giao_du_kien,
    partnerId: row.doi_tac_id,
    partnerCode: row.ma_doi_tac,
    partnerName: row.ten_doi_tac,
    createdByName: row.ho_ten_nguoi_tao,
    note: row.ghi_chu,
    orderedQuantity: Number(row.tong_so_luong_dat),
    shippedQuantity: Number(row.tong_so_luong_da_xuat),
    createdAt: row.created_at,
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
  /** Xác nhận, mở lại đơn đã xác nhận, đóng sớm — chỉ quản lý (D-06/D-07). */
  canApprove: boolean;
};
