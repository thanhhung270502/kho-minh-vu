import type {
  DocumentDetail,
  DocumentLine,
  DocumentRow,
} from "@/features/documents/types";

export type { DocStatus } from "@/features/documents/types";
export {
  DOC_STATUS_COLORS,
  DOC_STATUS_LABELS,
  exceedsStock,
  toDocumentDetail,
  toDocumentLine,
  toDocumentRow,
} from "@/features/documents/types";

/**
 * Alias tên miền của chiều xuất — KHÔNG định nghĩa lại, chỉ đổi tên hiển thị.
 *
 * `IssueRow` mở rộng thêm `orderId`/`orderNo`: `danh_sach_chung_tu` (RPC dùng
 * chung với `stock-in`/`returns`) không trả đơn gốc, nên cột "Đơn gốc" của
 * `/xuat-kho` được nối thêm ở tầng `api/issue.api.ts` bằng hai lượt đọc riêng
 * của chiều xuất, không sửa RPC chung chỉ để phục vụ một cột của một màn.
 */
export type IssueRow = DocumentRow & {
  orderId: string | null;
  orderNo: string | null;
};
export type IssueDetail = DocumentDetail;
export type IssueLine = DocumentLine;

export type IssuePermissions = {
  /** Tạo phiếu, thêm dòng, ghi sổ — văn phòng và quản lý. */
  canEdit: boolean;
  /** Hủy phiếu xuất đã ghi sổ — chỉ quản lý (đã chặn thật ở database). */
  canVoid: boolean;
};

/** Kiểu trả của RPC `goi_y_ma_trung` (D-14) — gợi ý mã gần giống còn tồn. */
export type SimilarCode = {
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  stock: number;
  similarity: number;
};

type SimilarCodeDb = {
  san_pham_id: string;
  ma_hang: string;
  ten_hang: string;
  kho_id: string;
  ten_kho: string;
  ton: number;
  do_giong: number;
};

export function toSimilarCode(row: SimilarCodeDb): SimilarCode {
  return {
    productId: row.san_pham_id,
    productCode: row.ma_hang,
    productName: row.ten_hang,
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    stock: Number(row.ton),
    similarity: Number(row.do_giong),
  };
}
