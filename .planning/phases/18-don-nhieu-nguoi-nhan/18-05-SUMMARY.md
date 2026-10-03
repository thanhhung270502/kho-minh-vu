---
phase: 18-don-nhieu-nguoi-nhan
plan: 05
subsystem: sales-order-ui
tags: [antd, recipients, keyboard-flow]
requires: ["18-03"]
provides:
  - "useOrderLineActions: thêm/sửa số lượng/sửa người nhận/xóa dòng kèm thông báo lỗi và báo tự thêm người nhận (D1)"
  - "Cột 'Người nhận' trên lưới dòng, chỉ khi đơn đa người nhận hoặc đã gán dòng"
  - "Ô 'Người nhận' dính ở hàng nhập dòng"
affects: [18-08]
key-files:
  created:
    - src/features/sales-order/hooks/use-order-line-actions.ts
  modified:
    - src/shared/components/staff-select.tsx
    - src/features/sales-order/components/order-line-columns.tsx
    - src/features/sales-order/components/order-line-table.tsx
    - src/features/sales-order/components/order-line-entry-row.tsx
    - src/features/sales-order/components/order-detail.tsx
key-decisions:
  - "StaffSelect chỉ thêm prop tùy chọn (placeholder, size, extraOptions); onChange thêm tham số tên thứ hai, caller cũ không vỡ"
  - "Người nhận dính ở hàng nhập tính khi render: người bị bỏ khỏi đơn tự rơi về Chung"
  - "Không gắn Enter vào ô Người nhận; chuỗi mã → Enter → số lượng → Enter giữ nguyên"
requirements-completed: [NNHAN-02]
duration: 10min
completed: 2026-10-03
---

# Phase 18 Plan 05: Lưới dòng gán người nhận Summary

Lưới dòng đơn gán người nhận theo dòng (xóa = hàng chung), đơn một người nhận giữ nguyên lưới và hàng nhập cũ; đầu đơn hiện `formatOrderRecipients`.

## Commits

- da7d6dd: hook thao tác dòng đơn và StaffSelect mở rộng
- e5dab6b: gán người nhận theo dòng trên lưới đơn

## Deviations from Plan

None.

## Known Stubs

None.

## Kiểm

tsc path-filtered rỗng cho 6 file, eslint sạch, `test-pure-functions.ts` xanh; order-line-table 157, columns 173 dòng. Chưa kiểm trình duyệt (thuộc 18-08). Không push/deploy trước khi 18-08 xanh `npm run check`.

## Self-Check: PASSED
