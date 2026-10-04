---
phase: 20-giao-dien-3b
plan: 08
subsystem: ui
tags: [products, detail, permissions]
requires: [20-05]
provides:
  - ProductDetailHeader
  - ProductInfoCard
  - view-cost permission
affects: []
key-files:
  created:
    - src/features/products/components/product-detail-header.tsx
    - src/features/products/components/product-info-card.tsx
    - src/features/products/lib/product-audit-labels.ts
  modified:
    - src/shared/lib/permissions.ts
    - src/features/products/components/product-detail.tsx
    - src/app/(app)/danh-muc/[id]/page.tsx
requirements-completed: [UI3B-07]
---

# Phase 20 Plan 08: Chi tiết hàng hóa khung 5c Summary

Chi tiết hàng hai cột: đầu trang có mã lớn + badge trạng thái + nút Ngừng/Mở lại kinh doanh (qua `useBulkAssign`, source `sua_o`) + Sửa; thân trái gồm Thông tin hàng (lưới 4×3, 12 trường), Tồn theo kho (cột Giá trị theo quyền `view-cost`) và tab Thẻ kho/Lịch sử sửa; aside phải là ảnh. `product-detail.tsx` từ 230 xuống 115 dòng.

## Commits

- 35db1ed: header, info card, view-cost, nhãn nhật ký tách lib
- 8871e4d: (task 2) chi tiết hai cột + route ghép aside ảnh — 8871e4d

## Deviations from Plan

None. `npm run check` thay bằng `npm run typecheck` + eslint (worktree không build được); orchestrator chạy check đầy đủ sau merge. Chưa kiểm trình duyệt.

## Known Stubs

None.

## Self-Check: PASSED
