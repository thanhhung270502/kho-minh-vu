// File thuần (bẫy 9).
import { isPostgrestError } from "@/shared/lib/errors";

/**
 * `ghi_so_chung_tu` ném 23514 "Xuất quá tồn ... Phải chọn lý do xuất âm" khi
 * hóa đơn có dòng làm tồn âm mà chưa có lý do. hoan_thanh_don cuộn lại toàn bộ,
 * nên client hỏi lý do rồi gọi lại — database là nơi DUY NHẤT biết dòng nào âm.
 * Lỗi PostgREST là object thường, không instanceof (bẫy 8).
 */
export function needsNegativeReason(error: unknown): boolean {
  return isPostgrestError(error) && error.code === "23514" && error.message.includes("lý do xuất âm");
}
