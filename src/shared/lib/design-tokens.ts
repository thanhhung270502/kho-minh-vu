// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Server Component (vd. dashboard Phase 5) và Client Component đều import
// được từ đây.

/**
 * Dãy màu biểu đồ Recharts — design system đơn sắc "Kho Minh Vu 1A": series
 * chính màu mực, series phụ xám, chỉ dùng cam/đỏ khi series mang nghĩa cảnh báo.
 */
export const CHART_COLORS = [
  "#0A0A0A",
  "#C7C7C7",
  "#737373",
  "#E08A1E",
  "#D9352B",
  "#A3A3A3",
] as const;

/** Màu ngữ nghĩa — khớp colorPrimary/Success/Warning/Error ở antd-theme.ts. */
export const SEMANTIC_COLORS = {
  primary: "#0A0A0A",
  success: "#2F9E5B",
  warning: "#E08A1E",
  danger: "#D9352B",
} as const;
