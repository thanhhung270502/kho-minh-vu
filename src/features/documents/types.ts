import { toStaffRefs, type StaffRef } from "@/shared/lib/recipient";
import type { StatusTone } from "@/shared/lib/status-tone";
import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];

type DocumentRowDb = Fn["danh_sach_chung_tu"]["Returns"][number];
type DocumentDetailDb = Fn["chi_tiet_chung_tu"]["Returns"][number];
type DocumentLineDb = Fn["dong_chung_tu"]["Returns"][number];

/**
 * Giá trị enum của database — không đổi. Tên trung tính vì bảy loại chứng từ
 * đều dùng chung; `stock-in` re-export dưới tên cũ `ReceiptSource` để component
 * hiện có không phải đổi.
 */
export type DocumentSource = Database["public"]["Enums"]["nguon_nhap"];
export type DocStatus = Database["public"]["Enums"]["trang_thai_ct"];

export type DocumentRow = {
  id: string;
  docNo: string;
  docType: Database["public"]["Enums"]["loai_ct"];
  docDate: string;
  postedAt: string | null;
  source: DocumentSource;
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
  source: DocumentSource;
  status: DocStatus;
  partnerId: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  /**
   * Nhân viên nhận của hóa đơn sinh từ đơn — chép ở tao_phieu_xuat_tu_don (0091).
   * Các field `partner*` ở trên giữ cho đối tác / nhà cung cấp.
   */
  staffRecipients: StaffRef[];
  warehouseId: string | null;
  warehouseName: string | null;
  createdByName: string | null;
  note: string | null;
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
  /** Đơn gốc sinh ra phiếu này (`tao_phieu_xuat_tu_don`) — null nếu tạo tay. */
  orderId: string | null;
  orderNo: string | null;
  /** Chứng từ gốc của phiếu trả (`tao_phieu_tra`) — null nếu không phải phiếu trả. */
  sourceDocId: string | null;
  sourceDocNo: string | null;
  /** Lý do xuất âm (D-11) — null nếu phiếu không xuất âm dòng nào. */
  negativeReason: string | null;
  negativeReasonNote: string | null;
  approvedById: string | null;
  /** Người ghi sổ — lấy qua RPC vì RLS không cho đọc tên người khác. */
  approvedByName: string | null;
  /** Người xác nhận đơn gốc của hóa đơn (0115) — "Người duyệt đơn" ở màn Duyệt đơn. */
  orderApprovedByName: string | null;
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
  /** Tồn hiện tại của kho dòng này — dùng tô màu dòng vượt tồn (D-12). */
  currentStock: number;
};

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  NHAP_LIEU: "Đang nhập liệu",
  HOAN_THANH: "Đã ghi sổ",
  DA_HUY: "Đã hủy",
};

export const DOC_STATUS_TONES: Record<DocStatus, StatusTone> = {
  NHAP_LIEU: "pending",
  HOAN_THANH: "done",
  DA_HUY: "muted",
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
    staffRecipients: toStaffRefs(row.nguoi_nhan_ids, row.ten_nguoi_nhan),
    warehouseId: row.kho_id,
    warehouseName: row.ten_kho,
    createdByName: row.ho_ten_nguoi_tao,
    note: row.ghi_chu,
    totalQuantity: Number(row.tong_so_luong),
    totalAmount: Number(row.tong_tien),
    createdAt: row.created_at,
    orderId: row.don_dat_hang_id,
    orderNo: row.so_dh,
    sourceDocId: row.chung_tu_goc_id,
    sourceDocNo: row.so_ct_goc,
    negativeReason: row.ly_do_xuat_am,
    negativeReasonNote: row.ghi_chu_ly_do,
    approvedById: row.nguoi_duyet_id,
    approvedByName: row.ho_ten_nguoi_duyet,
    orderApprovedByName: row.ho_ten_nguoi_xac_nhan_don,
  };
}

/**
 * D-12: dòng đổi màu ngay khi số ghi sổ vượt tồn hiện tại. Chỉ có ý nghĩa
 * với chứng từ làm GIẢM tồn (`XUAT`, `TRA_NCC`) — gọi cho chứng từ khác thì
 * phép so sánh vẫn đúng cú pháp nhưng vô nghĩa nghiệp vụ, caller tự lọc bằng
 * `documentCanGoNegative()` (`lib/doc-type-labels.ts`) trước khi dùng.
 */
export function exceedsStock(line: DocumentLine): boolean {
  return line.quantity > line.currentStock;
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
    currentStock: Number(row.ton_hien_tai),
  };
}

type DocumentLineRecipientDb = Fn["nguoi_nhan_dong_chung_tu"]["Returns"][number];

export type LineRecipient = {
  recipientId: string | null;
  recipientName: string | null;
};
export type DocumentLineRecipient = {
  lineId: string;
  recipientId: string;
  recipientName: string;
};

export function toDocumentLineRecipient(
  row: DocumentLineRecipientDb,
): DocumentLineRecipient {
  return {
    lineId: row.chung_tu_dong_id,
    recipientId: row.nguoi_nhan_id,
    recipientName: row.ten_nguoi_nhan,
  };
}

/** Nối người nhận theo dòng (RPC riêng, không sửa dong_chung_tu — 0088 nhánh quy chuẩn) vào dòng chứng từ. */
export function withLineRecipients<T extends { id: string }>(
  lines: T[],
  recipients: DocumentLineRecipient[],
): (T & LineRecipient)[] {
  const byLine = new Map(recipients.map((item) => [item.lineId, item] as const));
  return lines.map((line) => {
    const found = byLine.get(line.id);
    return {
      ...line,
      recipientId: found?.recipientId ?? null,
      recipientName: found?.recipientName ?? null,
    };
  });
}
