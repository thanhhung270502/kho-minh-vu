---
phase: 17-doi-ten-gon-don-dat
plan: 05
subsystem: sales-order
tags: [print, picking-slip, recipient, cleanup]
requires: ["17-02", "17-04"]
provides:
  - "recipientDisplayName: chỉ tên người nhận (A3)"
  - "Phiếu đi lấy hàng có Người đặt và In lúc HH:mm DD/MM/YYYY"
  - "Không còn Ngày giao dự kiến ở tạo/sửa/danh sách/in đơn"
affects: [17-06]
tech-stack:
  added: []
  patterns: ["giờ in làm mới ở sự kiện beforeprint"]
key-files:
  created: []
  modified:
    - src/shared/lib/recipient.ts
    - scripts/test-pure-functions.ts
    - src/features/sales-order/components/picking-print-template.tsx
    - src/features/sales-order/schemas/order.schema.ts
    - src/features/sales-order/api/order.api.ts
    - src/features/sales-order/hooks/useOrders.ts
    - src/features/sales-order/components/new-order-form.tsx
    - src/features/sales-order/components/order-header.tsx
    - src/features/sales-order/components/order-table-body.tsx
    - src/features/sales-order/types.ts
key-decisions:
  - "A3: phiếu lấy hàng chỉ in tên người nhận; formatRecipient giữ nguyên"
  - "DDAT-01: cột ngay_giao_du_kien và database.types.ts không đổi, chỉ ngừng đọc/gửi"
requirements-completed: [DDAT-01, DDAT-02, DDAT-03]
duration: 10min
completed: 2026-10-03
---

# Phase 17 Plan 05: Phiếu lấy hàng và bỏ Ngày giao Summary

Phiếu đi lấy hàng in tên người nhận (không "Nội bộ —", không mã), Người đặt (`createdByName`) và giờ in làm mới theo `beforeprint`; Ngày giao dự kiến bị gỡ khỏi mọi màn đơn mà không đụng DB.

## Tasks
1. Helper `recipientDisplayName` (TDD, 5 assert) + template in mới — `3ea9d2c`
2. Bỏ `deliveryDate` khỏi schema, api, hook, form tạo, đầu đơn, bảng danh sách, types — `febb8c3`

## Deviations from Plan
None - plan executed exactly as written.

## Verification
- `npm run check` và `npx tsx scripts/test-pure-functions.ts` xanh
- `grep -rn "deliveryDate|ngay_giao_du_kien|Ngày giao" src --exclude=database.types.ts` rỗng
- Không migration, không đổi `database.types.ts`/RPC
- Kiểm bằng mắt phiếu in để ở 17-06

## Known Stubs
None.

## Self-Check: PASSED
