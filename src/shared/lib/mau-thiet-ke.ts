// File thuần — không đánh dấu client, không import antd. Server Component (vd.
// dashboard Phase 5) và Client Component đều import được từ đây.

/** Dãy màu biểu đồ Recharts. Dashboard (Phase 5) import từ đây, không tự đặt màu. */
export const MAU_BIEU_DO = ["#2D68F8", "#22C55E", "#FB923C", "#EF4444", "#EC4899"] as const;

/** Màu ngữ nghĩa — dùng cho viền trái card KPI và trạng thái. */
export const MAU_NGU_NGHIA = {
  chinh: "#1652F0",
  tot: "#16A34A",
  canhBao: "#F59E0B",
  xau: "#E5484D",
} as const;
