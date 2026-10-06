import { isInternalPartnerCode } from "@/shared/lib/recipient";
import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

/** Giá trị enum `loai_doi_tac` của database — không đổi. */
export type PartnerKind = Database["public"]["Enums"]["loai_doi_tac"];

type PartnerRowDb = Fn["danh_sach_doi_tac"]["Returns"][number];
type PartnerDetailDb = Database["public"]["Tables"]["doi_tac"]["Row"];
type TransactionRowDb = Fn["lich_su_giao_dich_doi_tac"]["Returns"][number];

export type PartnerRow = {
  id: string;
  code: string;
  name: string;
  kind: PartnerKind;
  phone: string | null;
  address: string | null;
  region: string | null;
  email: string | null;
  taxCode: string | null;
  note: string | null;
  isActive: boolean;
  updatedAt: string;
  /** Số chứng từ đã ghi sổ (HOAN_THANH) của đối tác — 0080. */
  transactionCount: number;
  totalRows: number;
};

export type PartnerDetail = {
  id: string;
  code: string;
  name: string;
  kind: PartnerKind;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string | null;
  ward: string | null;
  taxCode: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionRow = {
  documentId: string;
  docNo: string;
  docType: string;
  date: string;
  source: string;
  lineCount: number;
  totalQuantity: number;
  note: string | null;
  totalRows: number;
};

/**
 * Loại người dùng thấy: chỉ "Đối tác" và "Nội bộ". Database vẫn giữ loai_doi_tac
 * (NCC / KHACH / CA_HAI) cho các ô chọn nhà cung cấp / người nhận; "Nội bộ" nhận ra
 * bằng mã NB… như mọi màn đơn hàng (isInternalPartnerCode).
 */
export type PartnerFormKind = "DOI_TAC" | "NOI_BO";

export const PARTNER_FORM_KINDS: PartnerFormKind[] = ["DOI_TAC", "NOI_BO"];

export const PARTNER_FORM_KIND_LABELS: Record<PartnerFormKind, string> = {
  DOI_TAC: "Đối tác",
  NOI_BO: "Nội bộ",
};

/**
 * Đối tác / nội bộ tạo mới lưu là CA_HAI: vừa chọn được làm nhà cung cấp ở phiếu nhập,
 * vừa làm người nhận ở đơn đặt (NB001 là người nhận, cũng là nơi trả hàng về kho).
 * Sửa thì giữ nguyên loại đang có.
 */
export const NEW_PARTNER_KIND: PartnerKind = "CA_HAI";

export function toPartnerFormKind(code: string): PartnerFormKind {
  return isInternalPartnerCode(code) ? "NOI_BO" : "DOI_TAC";
}

export function partnerKindLabel(code: string): string {
  return PARTNER_FORM_KIND_LABELS[toPartnerFormKind(code)];
}

/** Loại và mã phải khớp: Nội bộ ⇔ mã NB…. Trả câu báo lỗi, null = hợp lệ; mã trống không kiểm. */
export function kindCodeMismatch(kind: PartnerFormKind, code: string | null): string | null {
  if (!code) return null;
  const internalCode = isInternalPartnerCode(code);
  if (kind === "NOI_BO" && !internalCode) return "Mã nội bộ bắt đầu bằng NB và một chữ số (vd. NB003)";
  if (kind === "DOI_TAC" && internalCode) return "Mã NB… dành cho nội bộ — chọn loại Nội bộ hoặc đổi mã khác";
  return null;
}

/** Khóa là giá trị enum `loai_ct` trong database. */
const DOC_TYPE_LABELS: Record<string, string> = {
  NHAP: "Nhập kho",
  XUAT: "Hóa đơn",
  TRA_NCC: "Trả NCC",
  TRA_KHACH: "Khách trả",
};

export function docTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

export type ActiveStatus = "active" | "inactive" | "all";

export type PartnerFilter = {
  q: string;
  kind: PartnerKind | null;
  activeStatus: ActiveStatus;
  page: number;
};

export const DEFAULT_PARTNER_FILTER: PartnerFilter = {
  q: "",
  kind: null,
  activeStatus: "active",
  page: 1,
};

/** Đếm điều kiện đang bật, KHÔNG tính ô tìm kiếm (ô tìm nằm ngoài panel). */
export function countActivePartnerFilters(filter: PartnerFilter): number {
  let count = 0;
  if (filter.kind !== null) count++;
  if (filter.activeStatus !== DEFAULT_PARTNER_FILTER.activeStatus) count++;
  return count;
}

export function toPartnerRow(row: PartnerRowDb): PartnerRow {
  return {
    id: row.id,
    code: row.ma,
    name: row.ten,
    kind: row.loai,
    phone: row.dien_thoai,
    address: row.dia_chi,
    region: row.khu_vuc,
    email: row.email,
    taxCode: row.ma_so_thue,
    note: row.ghi_chu,
    isActive: row.dang_hoat_dong,
    updatedAt: row.updated_at,
    transactionCount: Number(row.tong_giao_dich),
    totalRows: Number(row.tong_so_dong),
  };
}

export function toPartnerDetail(row: PartnerDetailDb): PartnerDetail {
  return {
    id: row.id,
    code: row.ma,
    name: row.ten,
    kind: row.loai,
    phone: row.dien_thoai,
    email: row.email,
    address: row.dia_chi,
    region: row.khu_vuc,
    ward: row.phuong_xa,
    taxCode: row.ma_so_thue,
    note: row.ghi_chu,
    isActive: row.dang_hoat_dong,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTransactionRow(row: TransactionRowDb): TransactionRow {
  return {
    documentId: row.chung_tu_id,
    docNo: row.ma_phieu,
    docType: row.loai,
    date: row.ngay,
    source: row.nguon,
    lineCount: Number(row.so_dong),
    totalQuantity: Number(row.tong_so_luong),
    note: row.ghi_chu,
    totalRows: Number(row.tong_so_dong),
  };
}
