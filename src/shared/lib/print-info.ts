// File thuần (bẫy 9): chữ cố định trên 3 phiếu in, theo phiếu mẫu gửi ngày 08/10/2026.
import { isInternalPartnerCode } from "@/shared/lib/recipient";

export const COMPANY_NAME = "CN CÔNG TY TNHH SX-TM P.TÙNG XE MÁY MINH VŨ";
export const COMPANY_BRANCH = "Chi Nhánh CTY TNHH SX-TM Phụ Tùng Xe Máy Minh Vũ";
export const COMPANY_ADDRESS = "125A - 130 Dương Tử Giang - Phường Chợ Lớn - Thành Phố Hồ Chí Minh";

export const INTERNAL_ONLY_NOTICE =
  "Lưu ý ! Phiếu này chỉ có giá trị lưu kho nội bộ, không có giá trị thay thế hóa đơn tài chính !";

/**
 * Loại xuất theo người nhận: đối tác nội bộ mã NB… là luân chuyển nội bộ; đối tác
 * ngoài là xuất bán. `title` / `codeLabel` dùng cho đầu phiếu Duyệt đơn.
 */
export function exportKindOf(partnerCode: string | null | undefined) {
  return isInternalPartnerCode(partnerCode)
    ? {
        label: "Luân Chuyển - Xuất Dùng Nội Bộ",
        title: "Lệnh Điều Chuyển - Xuất Dùng Nội Bộ",
        codeLabel: "Mã Xuất Dùng Nội Bộ",
      }
    : { label: "Xuất Bán", title: "Phiếu Xuất Bán", codeLabel: "Mã Hóa Đơn" };
}
