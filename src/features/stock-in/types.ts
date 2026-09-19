import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

type DocumentRowDb = Fn["danh_sach_chung_tu"]["Returns"][number];
type DocumentDetailDb = Fn["chi_tiet_chung_tu"]["Returns"][number];
type DocumentLineDb = Fn["dong_chung_tu"]["Returns"][number];

/** Giá trị enum của database — không đổi. */
export type ReceiptSource = Database["public"]["Enums"]["nguon_nhap"];
export type DocStatus = Database["public"]["Enums"]["trang_thai_ct"];

export type DocumentRow = {
  id: string;
  docNo: string;
  docType: Database["public"]["Enums"]["loai_ct"];
  docDate: string;
  postedAt: string | null;
  source: ReceiptSource;
  status: DocStatus;
  partnerId: string | null;
  partnerName: string | null;
  warehouseName: string | null;
  createdByName: string | null;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalRows: number;
};

export type DocumentDetail = {
  id: string;
  docNo: string;
  docType: Database["public"]["Enums"]["loai_ct"];
  docDate: string;
  postedAt: string | null;
  source: ReceiptSource;
  status: DocStatus;
  partnerId: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  createdByName: string | null;
  note: string | null;
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
};

export type DocumentLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  note: string | null;
};

export const RECEIPT_SOURCE_LABELS: Record<ReceiptSource, string> = {
  NCC: "NCC ngoài",
  NHA_MAY: "Nhà máy",
};

export const RECEIPT_SOURCE_COLORS: Record<ReceiptSource, string> = {
  NCC: "blue",
  NHA_MAY: "purple",
};

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  NHAP_LIEU: "Đang nhập liệu",
  HOAN_THANH: "Đã ghi sổ",
  DA_HUY: "Đã hủy",
};

export const DOC_STATUS_COLORS: Record<DocStatus, string | undefined> = {
  NHAP_LIEU: "gold",
  HOAN_THANH: "green",
  DA_HUY: undefined,
};

export type ReceiptPermissions = {
  /** Tạo phiếu, thêm dòng, ghi sổ. */
  canEdit: boolean;
  /** Hủy phiếu đã ghi sổ — chỉ quản lý (D-11). */
  canVoid: boolean;
};

export function toDocumentRow(row: DocumentRowDb): DocumentRow {
  return {
    id: row.id,
    docNo: row.so_ct,
    docType: row.loai_ct,
    docDate: row.ngay_ct,
    postedAt: row.ngay_ghi_so,
    source: row.nguon_nhap,
    status: row.trang_thai,
    partnerId: row.doi_tac_id,
    partnerName: row.ten_doi_tac,
    warehouseName: row.ten_kho,
    createdByName: row.ho_ten_nguoi_tao,
    lineCount: Number(row.so_dong),
    totalQuantity: Number(row.tong_so_luong),
    totalAmount: Number(row.tong_tien),
    totalRows: Number(row.tong_so_dong),
  };
}

export function toDocumentDetail(row: DocumentDetailDb): DocumentDetail {
  return {
    id: row.id,
    docNo: row.so_ct,
    docType: row.loai_ct,
    docDate: row.ngay_ct,
    postedAt: row.ngay_ghi_so,
    source: row.nguon_nhap,
    status: row.trang_thai,
    partnerId: row.doi_tac_id,
    partnerCode: row.ma_doi_tac,
    partnerName: row.ten_doi_tac,
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    createdByName: row.ho_ten_nguoi_tao,
    note: row.ghi_chu,
    totalQuantity: Number(row.tong_so_luong),
    totalAmount: Number(row.tong_tien),
    createdAt: row.created_at,
  };
}

export function toDocumentLine(row: DocumentLineDb): DocumentLine {
  return {
    id: row.id,
    productId: row.san_pham_id,
    productCode: row.ma_hang,
    productName: row.ten_hang,
    unitName: row.ten_dvt,
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    quantity: Number(row.so_luong),
    unitPrice: Number(row.don_gia),
    amount: Number(row.thanh_tien),
    note: row.ghi_chu,
  };
}
