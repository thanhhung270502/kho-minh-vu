---
phase: 09-quan-ly-hinh-anh
plan: 07
subsystem: images
tags: [tanstack-query, supabase-js, feature-api-layer, hinh-anh]

# Dependency graph
requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "src/features/images/lib/compress-image.ts (09-03), bảng hinh_anh + RPC dat_anh_chinh trên cloud (09-01/09-05)"
provides:
  - "src/features/images/types.ts — ProductImage, toProductImage, IMAGE_COLUMNS"
  - "src/features/images/api/image.api.ts — fetchProductImages, fetchPrimaryImageIds, uploadProductImage, deleteProductImage, setPrimaryImage, ImageRequestError"
  - "src/features/images/api/image.keys.ts — imageKeys.all/product(id)"
  - "src/features/images/hooks/useProductImages.ts — useProductImages, useUploadProductImage, useSetPrimaryImage, useDeleteProductImage"
  - "src/features/products/api/product.keys.ts — productKeys.lists (tiền tố invalidate bảng danh mục)"
affects: [09-10, 09-11]

tech-stack:
  added: []
  patterns:
    - "Feature images/api gọi trực tiếp getSupabaseBrowserClient() cho SELECT/RPC đọc-ghi đơn giản, còn upload/xóa đi qua Route Handler /api/anh/* (khuôn excel-import.api.ts: lớp lỗi title/action/status, 401 -> window.location.assign giữ ?tiep_tuc, parse JSON bằng zod)"

key-files:
  created:
    - src/features/images/types.ts
    - src/features/images/api/image.api.ts
    - src/features/images/api/image.keys.ts
    - src/features/images/hooks/useProductImages.ts
  modified:
    - src/features/products/api/product.keys.ts

key-decisions:
  - "Bỏ chữ 'xoa_luc' khỏi comment trong image.api.ts (đổi thành 'cột xóa mềm') để không phạm gate tự động cấm mọi xuất hiện của tên cột đó trong file — không đổi hành vi, code vẫn KHÔNG lọc theo cột này (RLS đã tự ẩn ảnh xóa)"

requirements-completed: [ANH-01, ANH-02, ANH-03]

duration: ~20min
completed: 2026-09-26
---

# Phase 9 Plan 07: Lớp dữ liệu client ảnh mã hàng (api, key, hook) Summary

**Bốn file mới trong `src/features/images/` (kiểu miền, hàm gọi Supabase/route thuần, query key, hook TanStack Query) cộng một khóa mở rộng trong `product.keys.ts` — component ở 09-10/09-11 chỉ gọi hook, không thấy tên cột `hinh_anh` hay nơi lưu ảnh.**

## Bối cảnh worktree

Worktree bắt đầu ở commit `93056b9`, `git merge main --ff-only` thành công ngay
(không có commit riêng nào trên nhánh worktree trước đó), kéo về toàn bộ Wave 1–2
của Phase 9 (migration 0068 đã trên cloud, `database.types.ts` đã có bảng
`hinh_anh` + RPC `dat_anh_chinh`, `compress-image.ts`/`image-rules.ts`/`image-url.ts`
từ 09-03, lớp storage server-only từ 09-06/09-09).

## Task Commits

1. **Task 1: types.ts + image.keys.ts + image.api.ts (+ productKeys.lists)** — `d936528`
2. **Task 2: hooks/useProductImages.ts** — `c014752`

## Accomplishments

- `types.ts`: `ProductImage` (camelCase) + `toProductImage` map 5 cột được grant
  (`id, san_pham_id, la_anh_chinh, thu_tu, created_at`) — không đụng
  `khoa_luu`/`khoa_luu_thumb` (không được grant, 42501).
- `image.api.ts`: năm hàm đúng chữ ký plan —
  `fetchProductImages` (order ảnh chính trước, rồi `thu_tu`, rồi `created_at`),
  `fetchPrimaryImageIds` (mảng rỗng → `{}` không gọi mạng),
  `setPrimaryImage` (RPC `dat_anh_chinh`),
  `uploadProductImage`/`deleteProductImage` (Route Handler `/api/anh/tai-len`,
  `/api/anh/xoa`, lỗi qua `ImageRequestError` + `readRouteError` dùng lại khuôn
  của `excel-import.api.ts`: 401 → `window.location.assign` giữ `?tiep_tuc`,
  parse JSON thành công bằng zod).
- `image.keys.ts`: `imageKeys.all` / `imageKeys.product(id)`.
- `product.keys.ts`: thêm `lists` (tiền tố `["products", "list"]`) để mutation
  ảnh làm mới mọi trang bảng danh mục mà không đụng `detail`/`stockCard`.
- `useProductImages.ts`: `useProductImages` có `enabled: productId !== ""`
  (bẫy 10); ba mutation (`useUploadProductImage` nén ảnh bằng `compressImage`
  rồi upload, `useSetPrimaryImage`, `useDeleteProductImage`) đều invalidate cả
  `imageKeys.product(productId)` và `productKeys.lists`; upload thêm `onSettled`
  để một file lỗi giữa lô không chặn làm mới những file đã lên trước đó.

## Verification

- `npm run typecheck` xanh sau cả hai task.
- `npm run lint` xanh sau cả hai task (chỉ chạy được từ Task 2 theo `<verify>`
  của plan, đã chạy thêm cho Task 1 để chắc chắn).
- Gate tự động của Task 1: `productKeys.lists` tồn tại, không có `select("*")`,
  không xuất hiện tên cột xóa mềm trong `image.api.ts`, không có
  `san_pham_id`/`la_anh_chinh` trong bất kỳ `.tsx` nào dưới `src/features/images`.
- Gate tự động của Task 2: `compressImage`, `productKeys.lists`, `enabled` đều
  xuất hiện trong `useProductImages.ts`.
- **Lưu ý parallel_execution:** `npm run build` KHÔNG chạy được trong worktree
  này (Turbopack lỗi vì `node_modules` là symlink) — đã dùng
  `npm run typecheck && npm run lint` thay thế theo đúng chỉ dẫn; build thật sẽ
  chạy trên `main` sau khi orchestrator merge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Gate tự động cấm tên cột xóa mềm trong image.api.ts va chạm với comment giải thích**
- **Found during:** chạy `<verify><automated>` của Task 1 lần đầu
- **Issue:** Comment giải thích lý do không lọc theo cột xóa mềm (RLS đã tự ẩn
  ảnh xóa) viết nguyên văn tên cột đó, khiến gate `! grep -q "<tên cột>"`
  (cấm MỌI xuất hiện của chuỗi này trong file, kể cả trong comment) trượt.
- **Fix:** Đổi câu comment sang diễn giải "cột xóa mềm" thay vì viết thẳng tên
  cột — không đổi hành vi code (vẫn không lọc thêm điều kiện nào ngoài
  `san_pham_id`, RLS xử lý phần còn lại).
- **Files modified:** `src/features/images/api/image.api.ts`
- **Commit:** gộp vào commit Task 1 (`d936528`), phát hiện ngay khi chạy verify
  lần đầu, chưa từng commit bản sai.

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking, va chạm gate tự động).
Không đổi ngữ nghĩa, không đổi acceptance criteria.

### Auth gates

Không có.

## Known Stubs

Không có — bốn file đều là lớp dữ liệu client hoàn chỉnh theo đúng hợp đồng
route đã chốt trong `<objective>` của plan (route `/api/anh/tai-len`,
`/api/anh/xoa` do 09-09 hiện thực, plan này chỉ gọi). Chưa có component nào gọi
hook (thuộc phạm vi 09-10/09-11), nên chưa kiểm bằng mắt trên trình duyệt thật.

## Issues Encountered

Không có sự cố ngoài deviation đã ghi ở trên.

## User Setup Required

Không — không cần cấu hình dịch vụ ngoài nào ở plan này.

## Next Phase Readiness

- `useProductImages`/`useUploadProductImage`/`useSetPrimaryImage`/`useDeleteProductImage`
  sẵn sàng cho component thư viện ảnh trong chi tiết mã (09-10/09-11) — chỉ cần
  import hook, không cần biết tên cột hay nơi lưu ảnh.
- `productKeys.lists` sẵn sàng cho cột thumbnail bảng danh mục (09-11) dùng
  `fetchPrimaryImageIds` để tô ảnh chính theo mã.
- Route `/api/anh/tai-len` và `/api/anh/xoa` **chưa hiện thực** ở worktree này
  (thuộc 09-09, chạy song song) — `uploadProductImage`/`deleteProductImage` gọi
  đúng hợp đồng đã chốt trong `<objective>` nhưng chưa kiểm chứng thật với route
  sống; nếu 09-09 lệch hợp đồng (tên trường FormData, shape JSON lỗi), cần đối
  chiếu lại khi merge.

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: src/features/images/types.ts
- FOUND: src/features/images/api/image.api.ts
- FOUND: src/features/images/api/image.keys.ts
- FOUND: src/features/images/hooks/useProductImages.ts
- FOUND commit: d936528
- FOUND commit: c014752
