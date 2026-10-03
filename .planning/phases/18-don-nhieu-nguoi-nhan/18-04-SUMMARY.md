---
phase: 18-don-nhieu-nguoi-nhan
plan: 04
subsystem: sales-order-ui
tags: [antd, recipients, form]
requires: ["18-03"]
provides:
  - "StaffMultiSelect (shared): chọn nhiều nhân viên, lọc không dấu, Enter khi ô rỗng = gửi"
  - "RecipientPicker mới: chế độ + đối tác + danh sách nhân viên"
  - "Form tạo đơn gọi tao_don; đầu đơn gọi dat_nguoi_nhan_don"
affects: [18-05, 18-06, 18-07, 18-08]
key-files:
  created:
    - src/shared/components/staff-multi-select.tsx
  modified:
    - src/features/sales-order/components/recipient-picker.tsx
    - src/features/sales-order/components/new-order-form.tsx
    - src/features/sales-order/components/order-recipient-field.tsx
    - src/features/sales-order/components/order-header.tsx
key-decisions:
  - "Enter bắt ở onKeyDownCapture của div bọc (bẫy 14) để giữ nhịp gõ tên → Enter → Enter"
  - "Đổi chế độ không xóa staffIds; chỉ xóa partnerId khi về Nội bộ"
  - "Chế độ Đối tác ở đầu đơn: chọn nhân viên trước khi có đối tác thì báo 'Chọn đối tác trước' thay vì lưu"
requirements-completed: [NNHAN-01]
duration: 15min
completed: 2026-10-03
---

# Phase 18 Plan 04: UI tạo đơn và đầu đơn nhiều người nhận Summary

Tạo đơn Nội bộ chọn một hoặc nhiều nhân viên, Đối tác chọn một đối tác kèm nhân viên phụ trách tùy chọn; đầu đơn đặt cả tập người nhận qua `dat_nguoi_nhan_don`, lỗi 23514 của DB hiện nguyên câu, đơn khóa hiện đối tác + tag tên nhân viên.

## Commits

- 1c26ffc: tạo đơn chọn nhiều người nhận
- 678ef33: đầu đơn sửa nhiều người nhận

## Deviations from Plan

None. Thêm `RecipientsReadonly` export trong `order-recipient-field.tsx` (plan cho phép) để `order-header.tsx` gọn.

## Known Stubs

None.

## Kiểm

tsc path-filtered rỗng cho 5 file, eslint sạch, `test-pure-functions.ts` xanh; mọi file ≤ 200 dòng. Chưa kiểm trình duyệt (thuộc 18-08). Không push/deploy trước khi 18-08 xanh `npm run check`.

## Self-Check: PASSED
