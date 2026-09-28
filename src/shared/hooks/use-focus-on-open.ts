import { useEffect, type RefObject } from "react";

/**
 * Mở một chứng từ còn nhập liệu được thì con trỏ nằm sẵn ở ô mã hàng — người nhập
 * bằng bàn phím không phải Tab qua cả menu (checklist 5.2, 28/09).
 *
 * - Chỉ máy có chuột/bàn phím thật: trên điện thoại focus bật bàn phím ảo che nửa
 *   màn hình khi người dùng mới chỉ muốn xem phiếu.
 * - Không giật con trỏ nếu người dùng đã đứng ở ô khác.
 * - Hẹn `setTimeout(0)`: focus ngay trong vòng render bị render kế tiếp dọn mất (bẫy 14).
 */
export function useFocusOnOpen(
  ref: RefObject<{ focus: () => void } | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;
    const timer = setTimeout(() => {
      if (document.activeElement === document.body) ref.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [ref, enabled]);
}
