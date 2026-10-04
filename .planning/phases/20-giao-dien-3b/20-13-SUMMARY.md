---
phase: 20-giao-dien-3b
plan: 13
subsystem: sales-order
tags: [excel, export, api-route]
requirements: [UI3B-05]
key-files:
  created:
    - src/shared/lib/download-file.ts
    - src/features/sales-order/lib/order-workbook.server.ts
    - src/app/api/don-dat/xuat-excel/route.ts
    - src/features/sales-order/components/order-excel-button.tsx
  modified:
    - src/features/products/components/excel-button.tsx
    - src/app/(app)/don-dat/page.tsx
---

# Phase 20 Plan 13: Xuất Excel Đơn đặt Summary

Route `/api/don-dat/xuat-excel` xuất .xlsx theo bộ lọc URL (lặp trang 200 đơn, 422 khi vượt 2.000, 401 JSON khi chưa đăng nhập), builder exceljs 10 cột không có giá, nút "Xuất Excel" ở PageHeader; `downloadFile` nâng lên `src/shared/lib/`.

## Deviations from Plan

None. Verification: `npm run typecheck` + eslint on touched files pass; `next build` and dev-server checks (401 curl, file open) not run in worktree — orchestrator runs full check after merge.

## Cho 20-16

Thêm dòng `/api/don-dat/xuat-excel` vào ma trận quyền route (`scripts/test-route-permissions.ts`): chưa đăng nhập 401, 4 vai trò 200.

## Known Stubs

None.

## Self-Check: PASSED
