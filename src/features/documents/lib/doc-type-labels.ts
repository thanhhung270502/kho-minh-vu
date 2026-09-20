import type { Database } from "@/types/database.types";

type DocType = Database["public"]["Enums"]["loai_ct"];

/** Nhãn tiếng Việt của bảy loại chứng từ — dùng trong hộp xác nhận ghi sổ/hủy. */
export const DOC_TYPE_ACTION_LABEL: Record<DocType, string> = {
  NHAP: "phiếu nhập",
  XUAT: "phiếu xuất",
  TRA_KHACH: "phiếu trả hàng khách",
  TRA_NCC: "phiếu trả hàng NCC",
  CHUYEN_KHO: "phiếu chuyển kho",
  KIEM_KE: "phiếu kiểm kê",
  DIEU_CHINH: "phiếu điều chỉnh",
};

/** Chiều tồn khi ghi sổ — dùng trong câu tóm tắt trước khi ghi sổ (D-12). */
export const DOC_TYPE_STOCK_VERB: Record<DocType, string> = {
  NHAP: "sẽ cộng vào kho",
  XUAT: "sẽ trừ khỏi kho",
  TRA_KHACH: "sẽ cộng vào kho",
  TRA_NCC: "sẽ trừ khỏi kho",
  CHUYEN_KHO: "sẽ chuyển giữa hai kho",
  KIEM_KE: "sẽ điều chỉnh theo kết quả kiểm kê",
  DIEU_CHINH: "sẽ điều chỉnh tồn kho",
};

/**
 * Loại chứng từ nào có thể làm tồn ÂM khi ghi sổ — chỉ hai loại này mới cần
 * hỏi lý do xuất âm (D-11) và tô màu dòng vượt tồn (D-12). `TRA_KHACH` làm
 * tồn tăng nên không bao giờ cần — nhầm sẽ mời chọn lý do vô nghĩa.
 */
export function documentCanGoNegative(docType: DocType): boolean {
  return docType === "XUAT" || docType === "TRA_NCC";
}
