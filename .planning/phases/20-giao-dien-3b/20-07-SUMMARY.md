---
phase: 20-giao-dien-3b
plan: 07
subsystem: ui
requirements: [UI3B-01]
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 07: Vỏ app 3b Summary

Header hai tầng (logo tròn + slot ô tìm + avatar / tab chữ gạch chân 2px) và `offsetHeader` cho 6 bảng dính.

## Chữ ký cho 20-09

- `AppShell({ user, search?: ReactNode, children })` truyền xuống `TopNav({ user, entries, activeHref, search? })`.
- `search` render ở giữa tầng 1 (`flex-1`, canh giữa từ lg, canh phải dưới lg). Layout server `src/app/(app)/layout.tsx` chưa đổi: 20-09 chỉ cần `<AppShell user={user} search={<…/>}>`.
- `useStickyTableOffset()` (60 dưới lg, 105 từ lg); hằng `HEADER_TOP_HEIGHT`, `HEADER_TABS_HEIGHT` khớp `h-[60px]` / `h-11`+`border-b` ở top-nav.

## Thay đổi chính

- nav-pill: tab `border-b-2`, active chữ đen đậm, khác xám; caret 9px; DropdownPill bỏ prop `icon`.
- use-nav-overflow: `ITEM_GAP = 4`, `NAV_CHROME = 0`.
- account-menu: tên + avatar tròn, bỏ vai trò/caret ở nút; vai trò chuyển vào mục đầu (disabled) của menu.
- 6 bảng: `sticky={{ offsetHeader }}`.

## Deviations

- top-nav: thêm div ngoài mang `px-6` + viền, `containerRef` ở div trong không padding để `NAV_CHROME = 0` đo đúng (clientWidth không bao gồm padding).
- `npm run check`: chỉ chạy typecheck + lint (xanh); `next build` không chạy trong worktree. Orchestrator chạy full check sau merge. Không mở dev server nên chưa soát console antd / trực quan (UAT ở 20-16).

## Commits

- 6 file shared: feat(ui) header hai tầng
- ce6477e fix(ui) offsetHeader cho 6 bảng

## Self-Check: PASSED
