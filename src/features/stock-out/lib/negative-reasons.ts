/**
 * Bốn lý do xuất âm (D-11) — chốt mã và nhãn ĐÚNG MỘT CHỖ, mọi nơi khác import.
 * File thuần, không gắn chỉ thị client component nào (bẫy 9): màn in và
 * Server Component cũng có thể cần đọc nhãn.
 *
 * Thứ tự có ý nghĩa: `MA_BI_TACH` đứng đầu vì đó là nguyên nhân gốc người dùng
 * chỉ ra (mã bị tách/xuất nhầm mã do quy chuẩn mã thay đổi giữa chừng — xem
 * 04-CONTEXT.md mục <specifics>), sẽ là lựa chọn nằm trên cùng trong giao diện.
 */
export const NEGATIVE_REASONS = [
  "MA_BI_TACH",
  "HANG_VE_CHUA_NHAP",
  "LECH_TON_CHO_KIEM_KE",
  "KHAC",
] as const;

export type NegativeReasonCode = (typeof NEGATIVE_REASONS)[number];

export const NEGATIVE_REASON_LABELS: Record<NegativeReasonCode, string> = {
  MA_BI_TACH: "Mã bị tách / xuất nhầm mã",
  HANG_VE_CHUA_NHAP: "Hàng đã về, chưa nhập phiếu",
  LECH_TON_CHO_KIEM_KE: "Lệch tồn, chờ kiểm kê",
  KHAC: "Khác",
};

/**
 * Trả nhãn tiếng Việt nếu mã nằm trong danh sách cố định; ngược lại trả
 * chính chuỗi đó — `chung_tu.ly_do_xuat_am` là `text` tự do ở tầng database
 * (cố ý, D-11), dữ liệu cũ hoặc dữ liệu test có thể chứa chuỗi tự do, giao
 * diện không được vỡ vì thế.
 */
export function negativeReasonLabel(code: string | null): string | null {
  if (code === null) return null;
  return (NEGATIVE_REASON_LABELS as Record<string, string>)[code] ?? code;
}
