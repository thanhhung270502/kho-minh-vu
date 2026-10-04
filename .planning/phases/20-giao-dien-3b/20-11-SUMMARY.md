---
phase: 20-giao-dien-3b
plan: 11
subsystem: ui
tags: [antd, tanstack-query, filters, sales-order]
requires:
  - phase: 20-giao-dien-3b
    provides: 20-04 token/StatusDot, 20-06 contract (statusCountKeyOf, date-presets, toOrderStatusCounts)
provides:
  - Panel lọc Đơn đặt kiểu 5a với số đếm trạng thái và preset ngày
affects: [20-12, 20-13]
key-files:
  created:
    - src/features/sales-order/components/order-status-filter.tsx
    - src/features/sales-order/components/date-range-filter.tsx
  modified:
    - src/features/sales-order/api/order.api.ts
    - src/features/sales-order/api/order.keys.ts
    - src/features/sales-order/hooks/useOrders.ts
    - src/features/sales-order/components/order-filter-panel.tsx
requirements-completed: [UI3B-05]
duration: 10min
completed: 2026-10-04
---

# Phase 20 Plan 11: Panel lọc Đơn đặt Summary

Panel lọc Đơn đặt có số đếm từng trạng thái (RPC `dem_don_theo_trang_thai`, key bỏ status/page nên đổi trạng thái hoặc trang không đếm lại), segmented loại người nhận, và preset ngày 7N/30N/Tháng/Tùy tính theo giờ VN.

## Commits
- 78f1020: số đếm đơn theo trạng thái (api, key, hook, OrderStatusFilter)
- 02334d3: DateRangeFilter + viết lại OrderFilterPanel

## Deviations from Plan
None. Hợp đồng URL không đổi (vẫn qua `onChange(filter)`).

## Notes
- Chỉ chạy `typecheck` + eslint (worktree không build được); orchestrator chạy `npm run check` sau merge.
- Không kiểm thủ công trên trình duyệt (không dev server trong worktree) — nên mở `/don-dat` một lần kiểm console và Network (chọn trạng thái không bắn lại RPC đếm).
- Preset "Tùy" chỉ là trạng thái UI cục bộ (`customOpen`); khoảng ngày chọn tay không trùng preset vẫn tô "Tùy" nhờ `activeDatePreset`.

## Known Stubs
None.

## Self-Check: PASSED
