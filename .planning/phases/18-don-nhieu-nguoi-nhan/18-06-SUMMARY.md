---
phase: 18-don-nhieu-nguoi-nhan
plan: 06
subsystem: sales-order-ui
tags: [antd, recipients, print, filter]
requires: ["18-03"]
provides:
  - "Danh sách đơn: cột Người nhận = Tag Nội bộ hoặc đối tác + Tag từng nhân viên"
  - "Bộ lọc Người nhận (một nhân viên) qua ?nhan_vien="
  - "Phiếu đi lấy hàng: đầu phiếu liệt kê nhân viên nhận, dòng Đối tác, cột Người nhận theo dòng"
affects: [18-08]
key-files:
  modified:
    - src/features/sales-order/components/order-table-body.tsx
    - src/features/sales-order/components/order-filter-panel.tsx
    - src/features/sales-order/components/picking-print-template.tsx
key-decisions:
  - "Không truyền placeholder cho StaffSelect ở bộ lọc (chữ mặc định chấp nhận được)"
  - "Phiếu một tờ chung, không nhóm theo người; 'Chung' chỉ ghi khi đơn ≥ 2 nhân viên"
requirements-completed: [NNHAN-03, NNHAN-04]
duration: 8min
completed: 2026-10-03
---

# Phase 18 Plan 06: Danh sách, lọc và phiếu lấy hàng Summary

Danh sách đơn hiện đủ người nhận, bộ lọc theo một nhân viên, phiếu lấy hàng in người nhận theo đơn và theo dòng với 7 cột khớp colSpan (7 và 5).

## Commits

- e1fcc94: danh sách đơn hiện và lọc theo người nhận
- ed1d71a: phiếu lấy hàng in người nhận theo dòng

## Deviations from Plan

None.

## Known Stubs

None.

## Kiểm

tsc path-filtered rỗng cho 3 file, eslint sạch, `test-pure-functions.ts` xanh; 7 thẻ th, colSpan 7/5. Bản in và bộ lọc chưa kiểm trình duyệt (thuộc 18-08). Không push/deploy trước khi 18-08 xanh `npm run check`.

## Self-Check: PASSED
