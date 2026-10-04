// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Server Component (vd. dashboard Phase 5) và Client Component đều import
// được từ đây.

/**
 * Dãy màu biểu đồ Recharts — design system đơn sắc 3b: series
 * chính màu mực, series phụ xám, chỉ dùng cam/đỏ khi series mang nghĩa cảnh báo.
 */
export const CHART_COLORS = [
  "#0A0A0A",
  "#D4D4D4",
  "#737373",
  "#BF6600",
  "#CC2827",
  "#A3A3A3",
] as const;

/** Màu ngữ nghĩa — khớp colorPrimary/Success/Warning/Error ở antd-theme.ts. */
export const SEMANTIC_COLORS = {
  primary: "#0A0A0A",
  success: "#2F9E5B",
  warning: "#BF6600",
  danger: "#CC2827",
} as const;
