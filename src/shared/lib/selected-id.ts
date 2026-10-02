// File thuần (bẫy 9): component client và scripts/test-pure-functions.ts cùng import.
// Dòng đang mở panel chi tiết nằm trên URL `?chon=<uuid>` — gửi link, tải lại
// trang, bấm Back đều giữ đúng mã đang xem. Tách khỏi bộ lọc của từng bảng:
// đổi trang/bộ lọc không làm đóng panel.

export const SELECTED_PARAM = "chon";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readSelectedId(params: URLSearchParams): string | null {
  const value = params.get(SELECTED_PARAM);
  return value && UUID.test(value) ? value : null;
}

/** Trả bản sao — không sửa `params` gốc (thường là `useSearchParams()` chỉ đọc). */
export function withSelectedId(params: URLSearchParams, id: string | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (id) next.set(SELECTED_PARAM, id);
  else next.delete(SELECTED_PARAM);
  return next;
}

/**
 * Phần tử trong dòng tự có hành vi riêng: ô chọn, ô sửa nhanh, ảnh phóng to,
 * nút, link. Bấm vào đó thì KHÔNG mở panel. Component tự đánh dấu thêm bằng
 * `data-no-row-click`.
 */
const INTERACTIVE =
  "a, button, input, label, textarea, [role='button'], .ant-select, .ant-checkbox-wrapper, .ant-image, [data-no-row-click]";

export function isInteractiveTarget(target: { closest: (selector: string) => unknown } | null): boolean {
  return target !== null && target.closest(INTERACTIVE) !== null;
}
