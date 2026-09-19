// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Server Component (vd. dashboard Phase 5) và Client Component đều import
// được từ đây.

/**
 * Dãy màu biểu đồ Recharts. Dashboard (Phase 5) import từ đây, không tự đặt màu.
 *
 * LƯU Ý: lần trích xuất CSS thật từ KiotViet chỉ chạy trên trang Kho hàng
 * (fnb.kiotviet.vn/hoffee/man/#/WareHouse) nên KHÔNG bắt được màu biểu đồ
 * dashboard thật của họ. Dãy dưới đây là SUY RA từ chính thang màu primary/
 * success/warning/danger đã trích xuất được, chưa phải giá trị trích xuất
 * trực tiếp — cần trích xuất lại khi có trang dashboard thật của KiotViet.
 */
export const MAU_BIEU_DO = [
  "#0070F4",
  "#00B63E",
  "#FF8800",
  "#FF0000",
  "#66A9F8",
  "#66D38B",
] as const;

/** Màu ngữ nghĩa — dùng cho viền trái card KPI và trạng thái. */
export const MAU_NGU_NGHIA = {
  chinh: "#0070F4",
  tot: "#00B63E",
  canhBao: "#FF8800",
  xau: "#FF0000",
} as const;
