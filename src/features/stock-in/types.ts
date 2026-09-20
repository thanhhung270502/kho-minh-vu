import type { DocumentSource } from "@/features/documents/types";

export type {
  DocStatus,
  DocumentDetail,
  DocumentLine,
  DocumentRow,
} from "@/features/documents/types";
export {
  DOC_STATUS_COLORS,
  DOC_STATUS_LABELS,
  toDocumentDetail,
  toDocumentLine,
  toDocumentRow,
} from "@/features/documents/types";

/** Alias tên cũ — chỉ NHẬP mới phân biệt nguồn NCC ngoài / nhà máy. */
export type ReceiptSource = DocumentSource;

export const RECEIPT_SOURCE_LABELS: Record<ReceiptSource, string> = {
  NCC: "NCC ngoài",
  NHA_MAY: "Nhà máy",
};

export const RECEIPT_SOURCE_COLORS: Record<ReceiptSource, string> = {
  NCC: "blue",
  NHA_MAY: "purple",
};

export type ReceiptPermissions = {
  /** Tạo phiếu, thêm dòng, ghi sổ. */
  canEdit: boolean;
  /** Hủy phiếu đã ghi sổ — chỉ quản lý (D-11). */
  canVoid: boolean;
};
