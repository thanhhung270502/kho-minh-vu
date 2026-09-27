---
phase: 09-quan-ly-hinh-anh
plan: 11
subsystem: ui
tags: [antd-image, tanstack-query, danh-muc, hinh-anh]

# Dependency graph
requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "fetchPrimaryImageIds, useProductImages, imageUrl (09-07/09-03)"
provides:
  - "src/features/products/types.ts — ProductRow.primaryImageId"
  - "fetchProducts gắn ảnh chính cho cả trang bằng một truy vấn fetchPrimaryImageIds"
  - "src/features/images/components/product-thumbnail-cell.tsx — ProductThumbnailCell"
  - "src/features/products/components/thumbnail-column.tsx — thumbnailColumn"
affects: [09-13]

tech-stack:
  added: []
  patterns:
    - "Cột thumbnail bảng: Image.PreviewGroup điều khiển (open/onOpenChange/current), chỉ tải danh sách ảnh khi preview mở (enabled: open) — không tải trước cho mọi dòng"

key-files:
  created:
    - src/features/images/components/product-thumbnail-cell.tsx
    - src/features/products/components/thumbnail-column.tsx
  modified:
    - src/features/products/types.ts
    - src/features/products/api/product.api.ts
    - src/features/products/components/product-columns.tsx

key-decisions:
  - "SummaryRow không sửa: nhãn 'Tổng cộng' vẫn đặt ở vị trí cột đầu tiên (position 0), nay là cột Ảnh 56px thay vì Mã hàng — chấp nhận nhãn hiển thị trong ô hẹp hơn, không sửa file dùng chung vì không có API để đổi vị trí nhãn và việc này không phá chức năng (xem Deviations)."

requirements-completed: [ANH-03, ANH-04]

duration: ~15min
completed: 2026-09-26
---

# Phase 9 Plan 11: Cột thumbnail ảnh chính ở bảng danh mục Summary

**Cột "Ảnh" 56px đầu bảng `/danh-muc`: ô xám khi chưa có ảnh, thumbnail 40×40 khi có, bấm vào phóng to tại chỗ và duyệt qua mọi ảnh của mã bằng `Image.PreviewGroup` điều khiển — ảnh chính của cả trang lấy bằng một truy vấn `fetchPrimaryImageIds`, không đổi RPC `danh_sach_san_pham`.**

## Bối cảnh worktree

Worktree ở sẵn commit `93056b9` (đã có toàn bộ Wave 1–3 của Phase 9), `git merge main --ff-only` báo "Already up to date" — không cần merge thêm. Symlink `node_modules`/`.env.local` được tạo mới ở đầu phiên.

## Task Commits

1. **Task 1: primaryImageId trên ProductRow, nạp cùng fetchProducts** — `7d5e562`
2. **Task 2: ProductThumbnailCell + cột 'Ảnh'** — `4a3d4d6`

## Accomplishments

- `ProductRow` thêm `primaryImageId: string | null`; `toProductRow`/`toProductDetail`
  gán `null` (chi tiết mã không cần — thư viện ảnh 09-10 tự tải).
- `fetchProducts`: sau khi map `raw` thành `rows`, gọi đúng một lần
  `fetchPrimaryImageIds(rows.map((r) => r.id))` rồi gắn `primaryImageId` vào
  từng dòng trước khi trả về — không đổi shape RPC, lỗi ném lên như mọi lỗi khác
  (QueryState bảng hiện lỗi + Thử lại).
- `ProductThumbnailCell` (`"use client"`): ô xám 40×40 + `PictureOutlined` mờ khi
  `primaryImageId === null`; khi có ảnh, dùng `Image.PreviewGroup` điều khiển bằng
  state `open` local — `useProductImages(productId, { enabled: open })` chỉ tải
  danh sách ảnh của mã đó khi người dùng bấm mở preview (không tải trước cho mọi
  dòng trong bảng). `items` và vị trí bắt đầu tính khi render từ `images.data`
  (rơi về `[imageUrl(primaryImageId)]` / index 0 khi preview chưa mở hoặc chưa tải
  xong) — đúng D-16 (qua lại giữa mọi ảnh) và D-17 (ô xám).
- `thumbnailColumn()`: cột `key: "image"`, `width: 56`, `fixed: "left"`, đặt đầu
  mảng cột trong `product-columns.tsx` (một import + một phần tử mảng, không đổi
  cột khác). File còn 197 dòng (dưới ngưỡng ~200 của CLAUDE.md).

## Xác minh

- `npm run typecheck` xanh sau cả hai task.
- `npm run lint` xanh (thay cho `npm run check` — `next build` không chạy được
  trong worktree do symlink `node_modules`, đúng ghi chú `<parallel_execution>`).
- Gate Task 1: `grep primaryImageId: string | null` trong `types.ts`,
  `grep fetchPrimaryImageIds` trong `product.api.ts` — cả hai khớp.
- Gate Task 2: `thumbnailColumn()` có trong `product-columns.tsx`, `enabled: open`
  và `Chưa có ảnh` có trong `product-thumbnail-cell.tsx`, file cột 197 dòng (≤205).
- `grep -n "visible\b\|onVisibleChange"` trên `product-thumbnail-cell.tsx` — rỗng
  (không dùng prop v5 đã bỏ, bẫy 11).
- Không có `select("*")` mới; không viết tay `/anh/` (chỉ gọi `imageUrl`).

## Deviations from Plan

None về mặt code — thực hiện đúng plan. Một quyết định có chủ đích, không phải
lỗi:

**Nhãn "Tổng cộng" của SummaryRow nay nằm ở cột Ảnh (56px) thay vì Mã hàng.**
`SummaryRow` (`src/shared/components/summary-row.tsx`) đặt cứng nhãn ở
`position === 0` của mảng `columns` truyền vào — không có prop nào để đổi vị trí
này. Vì cột "Ảnh" giờ là cột đầu tiên, nhãn "Tổng cộng — N mã" sẽ hiển thị co
trong ô rộng 56px thay vì ô "Mã hàng" rộng 170px như trước.

Theo đúng chỉ dẫn của plan ("không sửa `summary-row.tsx` nếu không cần"), đã
không sửa file dùng chung này vì: (1) đây là file `shared/`, sửa ảnh hưởng mọi
bảng khác đang dùng `SummaryRow`; (2) đây là vấn đề thẩm mỹ (nhãn co hẹp, vẫn đọc
được nhờ antd tự wrap), không phá chức năng tổng cộng/tồn kho; (3) `product-table-body.tsx`
không có cách nào khác (không có prop `labelColumnIndex`) để né việc này mà không
đổi `summary-row.tsx`. Ghi lại ở đây để 09-13 kiểm mắt và quyết định có cần sửa
`summary-row.tsx` (thêm prop chỉ định cột đặt nhãn) hay không.

## Known Stubs

Không có — cả hai component đều nối đủ dữ liệu thật (`fetchPrimaryImageIds`,
`useProductImages`), không có props/state đặt cứng rỗng.

## Issues Encountered

Không có sự cố ngoài quyết định SummaryRow đã ghi ở Deviations.

## User Setup Required

Không — không cần cấu hình dịch vụ ngoài nào ở plan này.

## Next Phase Readiness

- Cột "Ảnh" sẵn sàng kiểm mắt trên trình duyệt thật ở 09-13 (toàn ô xám cho tới
  khi có ảnh thật qua 09-10/09-09; phóng to tại chỗ, bộ lọc "Chưa có ảnh" đã có
  từ 09-08).
- Cân nhắc thêm prop `labelColumnIndex`/tương tự vào `SummaryRow` nếu 09-13 thấy
  nhãn "Tổng cộng" co trong cột 56px không chấp nhận được — chưa làm ở plan này
  theo đúng chỉ dẫn "không sửa nếu không cần".
- Chưa kiểm bằng mắt trên trình duyệt thật trong worktree này (`npm run dev`
  không chạy được — Turbopack + symlink) — để 09-13.

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: src/features/products/types.ts (primaryImageId)
- FOUND: src/features/products/api/product.api.ts (fetchPrimaryImageIds)
- FOUND: src/features/images/components/product-thumbnail-cell.tsx
- FOUND: src/features/products/components/thumbnail-column.tsx
- FOUND commit: 7d5e562
- FOUND commit: 4a3d4d6
