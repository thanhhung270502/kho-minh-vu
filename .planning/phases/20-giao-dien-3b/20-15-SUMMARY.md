---
phase: 20-giao-dien-3b
plan: 15
subsystem: sales-order
tags: [order-detail, them_dong_don, two-column]
requirements: [UI3B-06]
key-files:
  modified:
    - src/features/sales-order/api/order.api.ts
    - src/features/sales-order/hooks/use-order-line-actions.ts
    - src/features/sales-order/components/order-line-table.tsx
    - src/features/sales-order/components/order-line-columns.tsx
    - src/features/sales-order/components/order-detail.tsx
  created:
    - src/features/sales-order/components/order-aside.tsx
  removed:
    - src/features/sales-order/components/order-header.tsx (git mv to order-aside.tsx)
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 15: Chi tiết đơn hai cột + cộng dồn dòng Summary

Thêm dòng đơn đi qua RPC `them_dong_don` (cộng dồn khi trùng mã + người nhận dòng, thông báo "Đã cộng thêm …") và chi tiết đơn bố cục hai cột: thẻ "Hàng đặt · N dòng" và aside "Thông tin đơn".

## Commits
- Task 1: `feat(20-15): thêm dòng qua RPC...` (order.api.ts, use-order-line-actions.ts)
- Task 2: `feat(20-15): chi tiết đơn hai cột...` (components)

## Deviations from Plan
- `order-line-entry-row.tsx` KHÔNG sửa: khung nhập được bọc bằng div có selector `[&>div]:...` để bỏ viền/bo/margin cũ, tránh đổi file ngoài danh sách.
- `toOrderLineInsert` vẫn còn trong order.schema.ts vì scripts/test-pure-functions.ts còn dùng; chỉ bỏ import khỏi order.api.ts.
- Do worktree: chỉ chạy `typecheck` + `eslint` (xanh), chưa chạy `next build` và kiểm tra trình duyệt; orchestrator cần chạy sau merge (đặc biệt luồng Enter -> SL -> Enter -> quay về ô mã, và cộng dồn).

## Known Stubs
None.

## Self-Check: PASSED
- Files tồn tại: order-aside.tsx; order-header.tsx đã xóa; typecheck + eslint xanh; các file < 200 dòng.
