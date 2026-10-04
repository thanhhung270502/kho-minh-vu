---
phase: 20-giao-dien-3b
plan: 09
subsystem: ui
tags: [global-search, command-palette, antd, tanstack-query]
requires: [20-01, 20-06, 20-07]
provides:
  - GlobalSearch (⌘K / Ctrl+K) gắn vào header qua slot search của AppShell
key-files:
  created:
    - src/shared/hooks/use-debounced-value.ts
    - src/features/global-search/api/global-search.api.ts
    - src/features/global-search/api/global-search.keys.ts
    - src/features/global-search/hooks/useGlobalSearch.ts
    - src/features/global-search/components/global-search.tsx
    - src/features/global-search/components/global-search-modal.tsx
    - src/features/global-search/components/search-result-list.tsx
  modified:
    - src/app/(app)/layout.tsx
requirements: [UI3B-02]
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 09: Tìm kiếm toàn cục ⌘K Summary

Modal tìm kiếm tự dựng bằng antd Modal (không thư viện palette) gọi RPC `tim_kiem_toan_cuc`, debounce 200ms, nhóm kết quả, điều khiển bằng bàn phím, mục khớp tuyệt đối chọn sẵn.

## Commits
- 43ae6d0 feat(tim-kiem): api + hook tìm kiếm toàn cục
- 2987680 feat(tim-kiem): bảng tìm kiếm ⌘K ở header

## Deviations from Plan
- Mục không có href (chuyển kho) được lọc khỏi danh sách phẳng để ↑↓ không dừng ở mục không mở được.
- `npm run check` không chạy trong worktree (build bị Turbopack từ chối); chỉ chạy typecheck + lint (sạch). Orchestrator chạy check đầy đủ sau merge.
- Chưa kiểm thử thủ công trên trình duyệt (không có dev server trong worktree): cần mở console xác nhận không cảnh báo antd v6 (`styles.body`) và thử ⌘K.

## Known Stubs
Không có.

## Self-Check: PASSED
