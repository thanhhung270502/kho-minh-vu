---
phase: 17-doi-ten-gon-don-dat
plan: 04
subsystem: ui
tags: [products, rename, dead-code-removal]
requires: ["17-01", "17-03"]
provides:
  - "Danh sách hàng hóa không còn Cần rà / ĐVT mâu thuẫn (bộ lọc, nút, cảnh báo, modal, nhãn)"
  - "Nhãn Đơn đặt và Hàng ngoài ở feature products"
affects: [17-05, 17-06]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - src/features/products/components/product-secondary-actions.tsx
  modified:
    - src/features/products/schemas/filter.schema.ts
    - src/features/products/components/product-table.tsx
    - src/features/products/components/product-modals.tsx
    - src/features/products/components/bulk-assign-bar.tsx
    - src/features/products/components/product-columns.tsx
    - src/features/products/types.ts
    - scripts/test-pure-functions.ts
key-decisions:
  - "A2: bỏ cả ĐVT mâu thuẫn; giữ cột DB, RPC, database.types.ts, nhãn nhật ký sửa"
requirements-completed: [TEN-03, TEN-04, TEN-05]
duration: 15min
completed: 2026-10-03
---

# Phase 17 Plan 04: Gỡ Cần rà, nhãn Đơn đặt/Hàng ngoài ở products Summary

Gỡ toàn bộ UI "Cần rà" và "ĐVT mâu thuẫn" khỏi Danh sách hàng hóa (kèm lớp TS chết), `?can_ra=1` cũ bị bỏ qua, và đổi nhãn "Khách đặt" thành "Đơn đặt", "mua ngoài" thành "hàng ngoài".

## Tasks
1. Gỡ bộ lọc, nút, cảnh báo, modal Cần rà — `2833796` (review-actions đổi tên thành product-secondary-actions bằng git mv; xóa review-alert, stage-suggestions, nút Xác nhận đã rà, query đếm badge)
2. Bỏ nhãn và lớp TS chết (types, api, hooks, keys) — `996880c`
3. Nhãn Đơn đặt / Hàng ngoài + assert header CSV — `bba0913`

## Verification
- `npm run check` exit 0; test hàm thuần và test-excel-reader xanh
- Assert mới: `?can_ra=1` về bộ lọc mặc định, không có `p_can_ra`, header CSV chứa "Đơn đặt"
- `database.types.ts` và `supabase/` không đổi; còn đúng một nhãn "Cờ ĐVT mâu thuẫn" trong nhật ký sửa

## Deviations from Plan
None. Chưa chạy pgTAP 41/62 và duyệt trình duyệt (RPC không đụng). Còn comment "hàng mua ngoài" trong `create-receipt-button.tsx` (chữ thường, comment, đúng phạm vi plan).

## Known Stubs
None.

## Self-Check: PASSED
