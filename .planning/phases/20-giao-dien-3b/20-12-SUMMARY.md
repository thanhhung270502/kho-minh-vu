# Phase 20 Plan 12: Bảng Danh sách Đơn đặt kiểu 5a Summary

Cột Tiến độ dạng thanh (OrderProgressBar), chip trạng thái badge, chip "Nội bộ", số kết quả "N đơn" ở thanh công cụ.

requirements: [UI3B-05]

## Tasks
1. order-progress-bar.tsx (mới) + order-table-body.tsx: cột 128/96/260/150/128/110/28, giữ `sticky={{ offsetHeader }}`, bỏ `showTotal`.
2. order-toolbar.tsx (prop `total`) + order-table.tsx (`total={orders.data ? total : null}`).

## Deviations
None. Verification: `npm run typecheck` + eslint trên thư mục components sạch; full `npm run check` (build) và kiểm tra trình duyệt chưa chạy trong worktree, để orchestrator làm sau merge.

## Self-Check: PASSED
