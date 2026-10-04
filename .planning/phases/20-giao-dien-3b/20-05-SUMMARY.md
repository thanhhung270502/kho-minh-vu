---
phase: 20-giao-dien-3b
plan: 05
subsystem: ui
tags: [products, images, stock, aside]
requires: []
provides:
  - WarehouseStockTable
  - ProductImageAside
  - useProductCost
affects: [20-08]
key-files:
  created:
    - src/features/products/components/warehouse-stock-table.tsx
    - src/features/images/components/product-image-aside.tsx
    - src/features/images/components/image-thumb-strip.tsx
  modified:
    - src/features/products/api/product.api.ts
    - src/features/products/api/product.keys.ts
    - src/features/products/hooks/useProducts.ts
requirements-completed: [UI3B-07]
---

# Phase 20 Plan 05: Tồn theo kho + aside ảnh Summary

Bảng Tồn theo kho (Kho, Tồn, Tối thiểu, Giá trị theo quyền giá vốn qua RPC `gia_von_san_pham`) và aside ảnh (ảnh chính lớn, dải ảnh nhỏ, "+ Thêm", "Quản lý" mở modal thư viện Phase 9).

## Props cho 20-08

- `WarehouseStockTable({ productId: string; unitName: string | null; minStock: number; canViewCost: boolean })`
- `ProductImageAside({ productId: string; canEdit: boolean })`
- `useProductCost(productId, enabled)` — không bắn RPC khi `enabled` false.

`WarehouseStock` cũ giữ nguyên.

## Commits

- de74836: bảng tồn theo kho
- f239ebc: aside ảnh

## Deviations from Plan

- Tailwind token `border-vien-input` không tồn tại trong globals.css, dùng `border-trung-tinh-300` cho ô "+ Thêm".
- Thumbnail dùng `next/image` với `unoptimized` (eslint không báo `no-img-element`).
- Worktree ban đầu ở commit cũ; fast-forward lên nhánh phase-20 để có file plan.

## Known Stubs

None.

## Verification

`npm run typecheck` và eslint các file đã đổi sạch. Chưa kiểm trên trình duyệt (plan chưa ghép vào trang; không chạy dev server).

## Self-Check: PASSED
