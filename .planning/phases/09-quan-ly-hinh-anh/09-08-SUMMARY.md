---
phase: 09-quan-ly-hinh-anh
plan: 08
subsystem: frontend
tags: [filter, url-state, danh-muc, hinh-anh]

requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "danh_sach_san_pham(p_co_anh) trên cloud + database.types.ts sinh lại (09-01, 09-05)"
provides:
  - "src/features/products/schemas/filter.schema.ts: ImageFilter, ProductFilter.hasImage, ?anh=co|chua, toListRpcArgs().p_co_anh"
  - "src/features/products/components/product-filter-panel.tsx: ô Select 'Hình ảnh' (Có ảnh / Chưa có ảnh)"
affects: [09-09, 09-13]

tech-stack:
  added: []
  patterns:
    - "Bộ lọc ImageFilter đi đúng khuôn TradingStatus đã có: map hai chiều URL ↔ type, countActiveFilters, toListRpcArgs"

key-files:
  created: []
  modified:
    - src/features/products/schemas/filter.schema.ts
    - src/features/products/components/product-filter-panel.tsx
    - scripts/test-pure-functions.ts

key-decisions: []

requirements-completed: []

duration: ~20min
completed: 2026-09-26
---

# Phase 9 Plan 08: Bộ lọc "Có ảnh / Chưa có ảnh" ở bảng danh mục Summary

Thêm `ImageFilter` ("with"/"without") vào `ProductFilter` (D-18, ANH-04), đi hết đường
`?anh=co|chua` → `hasImage` → `p_co_anh` xuống RPC `danh_sach_san_pham`, cộng ô `Select`
"Hình ảnh" trong panel lọc `/danh-muc`.

## Bối cảnh worktree

Worktree đã ở đúng nhánh có Phase 9 (commit `732e31a` — sau merge của các plan trước đó),
không cần `git merge main` thêm. Symlink `node_modules` / `.env.local` được tạo ở đầu phiên
(chưa từng có, không phải do lệch trạng thái).

## Đã làm

**Task 1 (TDD) — `filter.schema.ts`:**
- RED trước: thêm `hasImage: "without"` vào `sampleFilter` và 10 assertion mới (đọc
  `anh=co|chua|xyz`, ghi `anh=co|chua`, `toListRpcArgs().p_co_anh` true/false/undefined,
  `countActiveFilters`) vào `scripts/test-pure-functions.ts`, chạy thấy đỏ đúng như kỳ vọng
  (thiếu field `hasImage` trên `sampleFilter` do type chưa có) — commit `42107b3`.
- GREEN: thêm `export type ImageFilter = "with" | "without"`, hai bảng map
  `IMAGE_FILTER_TO_URL` / `URL_TO_IMAGE_FILTER` (khuôn y hệt `TradingStatus`), field
  `hasImage` trên `ProductFilter` + `DEFAULT_PRODUCT_FILTER.hasImage = null`, đọc/ghi URL
  `anh=co|chua`, `p_co_anh` trong `toListRpcArgs`, và `countActiveFilters` đếm thêm ô mới —
  commit `50f0695`. `npm run typecheck` xanh không phải sửa chỗ nào khác (không có nơi nào
  khác dựng `ProductFilter` bằng object literal đầy đủ ngoài `sampleFilter`).

**Task 2 — `product-filter-panel.tsx`:**
- Thêm hằng `IMAGE_FILTER_OPTIONS` và `FilterGroup label="Hình ảnh"` (Select `allowClear`,
  đặt sau "Tồn", trước "Kinh doanh") — commit `c32a6de`. Không dùng `option value: null`
  (bẫy 11 CLAUDE.md), xóa chọn qua `allowClear`. File còn 163 dòng (dưới ngưỡng ~200).

## Xác minh

- `npx tsx scripts/test-pure-functions.ts` — xanh (bao gồm 10 case mới).
- `npm run typecheck` — xanh.
- `npm run lint` — xanh.
- `npm run check` (bao gồm `next build`) **không chạy được trong worktree này** — Turbopack
  lỗi vì `node_modules` là symlink (đúng như ghi chú `<parallel_execution>` của prompt, không
  phải lỗi code). Orchestrator sẽ chạy build thật trên `main` sau khi merge các nhánh song song.
- `grep -q "p_co_anh" filter.schema.ts` và `grep -q "anh=chua" test-pure-functions.ts` — cả
  hai khớp.
- `grep "value: null"` trên `product-filter-panel.tsx` — không khớp (đúng yêu cầu bẫy 11).

## Deviations from Plan

None — thực hiện đúng plan, không phát hiện vấn đề nào cần Rule 1-4.

## Known Stubs

Không có.

## Chưa làm (ngoài phạm vi plan)

- Kiểm mắt trên trình duyệt (URL thật sự lọc đúng, refresh giữ nguyên) — thuộc 09-13 theo
  đúng `<verification>` của plan này ("Kiểm mắt ở 09-13").
- `npm run build` thật (Turbopack) — chạy ở orchestrator trên `main`, không chạy được trong
  worktree do symlink `node_modules`.

## Self-Check: PASSED

- FOUND: `src/features/products/schemas/filter.schema.ts` chứa `p_co_anh`
- FOUND: `scripts/test-pure-functions.ts` chứa `anh=chua`
- FOUND: `src/features/products/components/product-filter-panel.tsx` chứa `Chưa có ảnh`
- FOUND commit `42107b3` (test RED)
- FOUND commit `50f0695` (feat schema, GREEN)
- FOUND commit `c32a6de` (feat panel)

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*
