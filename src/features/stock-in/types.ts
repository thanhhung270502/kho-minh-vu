import type { DocumentSource } from "@/features/documents/types";

export type {
  DocStatus,
  DocumentDetail,
  DocumentLine,
  DocumentRow,
} from "@/features/documents/types";
export {
  DOC_STATUS_TONES,
  RECEIPT_STATUS_LABELS as DOC_STATUS_LABELS,
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

export type ReceiptPermissions = {
  /** Tạo phiếu, thêm dòng, ghi sổ. */
  canEdit: boolean;
  /** Hủy phiếu đã ghi sổ — chỉ quản lý (D-11). */
  canVoid: boolean;
  /** Mở sửa phiếu nhập đã duyệt — quyền Sửa phiếu (mo_sua_chung_tu, 0128). */
  canReopen: boolean;
  /** Lập phiếu trả NCC — quyền Xác nhận / duyệt đơn (0130), không phải Nhập kho. */
  canReturn: boolean;
};
