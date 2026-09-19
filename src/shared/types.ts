/** Một trang dữ liệu kèm tổng số dòng của cả bộ lọc. */
export type Page<T> = { rows: T[]; total: number };
