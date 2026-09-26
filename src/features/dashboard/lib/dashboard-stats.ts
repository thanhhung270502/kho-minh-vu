// File thuần, KHÔNG "use client" — trang tổng quan (Server Component) gọi
// các hàm này để tổng hợp số liệu trước khi giao cho component hiển thị.
import {
  NEGATIVE_REASONS,
  negativeReasonLabel,
} from "@/features/documents/lib/negative-reasons";

/** Dữ liệu cũ có thể thiếu lý do xuất âm — đừng để giao diện vỡ vì `null`. */
const NO_REASON_LABEL = "Chưa ghi lý do";

export type NegativeReasonCount = {
  code: string | null;
  label: string;
  count: number;
};

/**
 * Đếm số dòng xuất âm theo lý do. Bốn lý do cố định trong `NEGATIVE_REASONS`
 * LUÔN có mặt, đúng thứ tự, kể cả khi đếm ra 0 — bảng/biểu đồ không phải tự
 * suy ra lý do nào đang thiếu (D-04). Mã lạ (không nằm trong danh sách cố
 * định, kể cả `null`) gộp thêm vào cuối theo thứ tự gặp lần đầu, nhãn giữ
 * nguyên văn qua `negativeReasonLabel`.
 */
export function countNegativeByReason(
  lines: ReadonlyArray<{ reasonCode: string | null }>,
): NegativeReasonCount[] {
  const counts = new Map<string | null, number>();
  const order: Array<string | null> = [...NEGATIVE_REASONS];

  for (const code of order) {
    counts.set(code, 0);
  }

  for (const { reasonCode } of lines) {
    if (!counts.has(reasonCode)) {
      counts.set(reasonCode, 0);
      order.push(reasonCode);
    }
    counts.set(reasonCode, (counts.get(reasonCode) ?? 0) + 1);
  }

  return order.map((code) => ({
    code,
    label: code === null ? NO_REASON_LABEL : (negativeReasonLabel(code) ?? code),
    count: counts.get(code) ?? 0,
  }));
}

export type SalesPaceComparison = {
  diff: number;
  trend: "up" | "down" | "same";
};

/**
 * So nhịp bán hôm nay với hôm qua bằng CHÊNH LỆCH TUYỆT ĐỐI, không chia —
 * hôm qua bằng 0 (kho mới mở, ngày nghỉ) không được làm phép tính nổ (D-09).
 */
export function compareSalesPace(
  today: number,
  yesterday: number,
): SalesPaceComparison {
  const diff = today - yesterday;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "same";
  return { diff, trend };
}
