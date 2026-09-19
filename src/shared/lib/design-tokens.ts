// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Server Component (vd. dashboard Phase 5) và Client Component đều import
// được từ đây.

/**
 * Dãy màu biểu đồ Recharts. Dashboard (Phase 5) import từ đây, không tự đặt màu.
 *
 * LƯU Ý: lần trích xuất CSS thật từ KiotViet chỉ chạy trên page Kho hàng
 * (fnb.kiotviet.vn/hoffee/man/#/WareHouse) nên KHÔNG bắt được màu biểu đồ
 * dashboard thật của họ. Dãy dưới đây là SUY RA từ chính thang màu primary/
 * success/warning/danger đã trích xuất được, chưa phải giá trị trích xuất
 * trực tiếp — cần trích xuất lại khi có page dashboard thật của KiotViet.
 */
export const CHART_COLORS = [
  "#0070F4",
  "#00B63E",
  "#FF8800",
  "#FF0000",
  "#66A9F8",
  "#66D38B",
] as const;

/** Màu ngữ nghĩa — dùng cho viền trái card KPI và trạng thái. */
export const SEMANTIC_COLORS = {
  primary: "#0070F4",
  success: "#00B63E",
  warning: "#FF8800",
  danger: "#FF0000",
} as const;
