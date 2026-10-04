"use client";

import { useSyncExternalStore } from "react";

// Hai hằng số này phải khớp `h-[60px]` (tầng 1) và `h-11` + `border-b` (tầng 2)
// ở components/top-nav.tsx — sửa một chỗ thì sửa cả hai.
export const HEADER_TOP_HEIGHT = 60;
export const HEADER_TABS_HEIGHT = 45;

const LG_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(LG_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Chiều cao header dính thật ở breakpoint hiện tại — dùng cho `sticky={{ offsetHeader }}` của bảng antd. */
export function useStickyTableOffset(): number {
  const isLg = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(LG_QUERY).matches,
    () => false,
  );
  return isLg ? HEADER_TOP_HEIGHT + HEADER_TABS_HEIGHT : HEADER_TOP_HEIGHT;
}
