// File thuần (bẫy 9): component và hàm định dạng cùng import.

/** Tiền và số lượng từ Postgres về có thể là string — chỉ dùng để HIỂN THỊ. */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("vi-VN");
}
