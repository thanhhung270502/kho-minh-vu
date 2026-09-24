/**
 * Ngưỡng "lệch lớn" dùng để tô nổi dòng cần chú ý trên bảng đếm kiểm kê.
 *
 * Giá trị khởi điểm (Claude's Discretion D-16, Assumption A1 trong
 * `06-RESEARCH.md`) — lúc lập kế hoạch người dùng chưa cho con số cụ thể.
 * Đã xác nhận với người dùng ngày 24/09/2026: ≥5 đơn vị HOẶC ≥10% tồn sổ.
 * Sửa đúng hằng số này là đổi ngưỡng cho toàn hệ thống kiểm kê.
 */
export const LARGE_DISCREPANCY_THRESHOLD = {
  absolute: 5,
  ratio: 0.1,
} as const;

/** Số đếm trừ tồn sổ — dương là dư, âm là thiếu. */
export function discrepancyOf(counted: number, book: number): number {
  return counted - book;
}

/**
 * Lệch bằng 0 luôn `false`. Lệch tuyệt đối đạt ngưỡng `absolute` thì lớn dù tỉ
 * lệ ra sao. Tồn sổ bằng 0 thì không tính theo tỉ lệ (chia cho 0) — chỉ xét
 * ngưỡng tuyệt đối. Tồn sổ âm vẫn dùng trị tuyệt đối để tính tỉ lệ.
 */
export function isLargeDiscrepancy(counted: number, book: number): boolean {
  const discrepancy = discrepancyOf(counted, book);
  if (discrepancy === 0) return false;

  const absDiscrepancy = Math.abs(discrepancy);
  if (absDiscrepancy >= LARGE_DISCREPANCY_THRESHOLD.absolute) return true;
  if (book === 0) return false;

  return absDiscrepancy / Math.abs(book) >= LARGE_DISCREPANCY_THRESHOLD.ratio;
}
