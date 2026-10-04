"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Khoảng cách giữa hai tab (gap-1); khung đo không có viền/padding (px-6 nằm
// ở div ngoài). Đổi class ở top-nav.tsx thì sửa ở đây.
const ITEM_GAP = 4;
const NAV_CHROME = 0;

/**
 * Đếm xem bao nhiêu mục điều hướng đầu tiên nằm vừa khung, phần còn lại gộp
 * vào mục "Khác". Đo thật bề rộng từng pill từ một hàng đo ẩn thay vì đoán
 * theo số ký tự — tên mục tiếng Việt có dấu rộng hẹp rất khác nhau.
 */
export function useNavOverflow(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const pills = Array.from(measure.children) as HTMLElement[];
      // Phần tử cuối của hàng đo là pill "Khác".
      const moreWidth = pills.at(-1)?.offsetWidth ?? 0;
      const widths = pills.slice(0, -1).map((el) => el.offsetWidth);
      const available = container.clientWidth - NAV_CHROME;

      const total = widths.reduce((sum, w) => sum + w, 0) + ITEM_GAP * (widths.length - 1);
      if (total <= available) {
        setVisibleCount(widths.length);
        return;
      }

      let used = moreWidth;
      let count = 0;
      for (const width of widths) {
        if (used + ITEM_GAP + width > available) break;
        used += ITEM_GAP + width;
        count += 1;
      }
      setVisibleCount(count);
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    // Font web tải xong làm pill rộng ra mà khung ngoài không đổi cỡ.
    observer.observe(measure);
    return () => observer.disconnect();
  }, [itemCount]);

  return { containerRef, measureRef, visibleCount };
}
