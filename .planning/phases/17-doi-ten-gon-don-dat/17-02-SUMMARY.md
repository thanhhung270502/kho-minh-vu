---
phase: 17-doi-ten-gon-don-dat
plan: 02
subsystem: routing
tags: [links, wording, rename]
requires: [17-01]
provides:
  - "Mọi link literal trong src/features và src/shared/components trỏ thẳng /don-dat, /duyet-don"
  - "Tên màn mới ở back-link, empty state, dialog tạo đơn"
affects: [17-05, 17-06]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/features/sales-order/components/*.tsx (order-actions, order-table-body, order-detail, order-table, create-order-button, new-order-form, new-order-card, complete-order-dialog)
    - src/features/sales-order/schemas/order.schema.ts
    - src/features/sales-order/hooks/useOrders.ts
    - src/features/stock-out/components/*.tsx (create-issue-button, issue-detail, issue-header, issue-table-body, issue-table)
    - src/features/stock-out/schemas/issue.schema.ts
    - src/features/stock-out/types.ts
    - src/features/returns/components/return-detail.tsx
    - src/features/dashboard/components/negative-stock-table.tsx
    - src/features/products/components/stock-card-columns.tsx
    - src/shared/components/partner-search-input.tsx
    - src/shared/components/staff-select.tsx
key-decisions:
  - "A1 giữ: 'Tạo hóa đơn', thẻ kho, số HĐ, nhãn quyền không đổi"
requirements-completed: [TEN-01, TEN-02]
duration: 5min
completed: 2026-10-03
---

# Phase 17 Plan 02: Link và tên màn Summary

22 file đổi chuỗi: link nội bộ đi thẳng `/don-dat` / `/duyet-don` (không qua redirect), back-link "← Đơn đặt" / "← Duyệt đơn" / "Về Duyệt đơn", empty state "Chưa có đơn đặt nào." / "Chưa có đơn nào để duyệt.", dialog "Tạo đơn đặt".

## Tasks
1. Feature sales-order — `0dbc7d1`
2. stock-out, returns, dashboard, thẻ kho, shared — `0f4daa0`

## Deviations from Plan
None về nội dung. Lần chạy sed đầu ở Task 1 không áp dụng cho nhiều file (zsh không tách từ biến); đã chạy lại đủ và amend vào cùng commit Task 1 trước khi sang Task 2.

## Verification
- `npm run typecheck` và `npm run check` xanh
- `grep -rnE '/(dat-hang|hoa-don|xuat-kho)' src/features src/shared/components` rỗng
- "Tạo hóa đơn" còn 2 chỗ trong create-issue-button.tsx (A1)
- Chưa đụng `deliveryDate` (để 17-05)

## Known Stubs
None.

## Self-Check: PASSED
