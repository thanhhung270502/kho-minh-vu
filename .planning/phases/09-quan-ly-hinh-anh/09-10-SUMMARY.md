---
phase: 09-quan-ly-hinh-anh
plan: 10
subsystem: images
tags: [antd-image, react-query-mutation, upload-queue, product-detail]

# Dependency graph
requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "src/features/images/hooks/useProductImages.ts (09-07), image-rules.ts/compress-image.ts/image-url.ts (09-03)"
provides:
  - "src/features/images/components/image-upload-button.tsx — ImageUploadButton (camera + multi-file, hàng đợi tuần tự)"
  - "src/features/images/components/image-tile.tsx — ImageTile (ô ảnh + Đặt ảnh chính/Xóa)"
  - "src/features/images/components/product-image-gallery.tsx — ProductImageGallery (mục Hình ảnh, 4 trạng thái, PreviewGroup)"
  - "src/features/products/components/product-detail.tsx — prop imagesSection (slot theo khuôn kiotVietHistoryTab)"
affects: [09-13, 09-11]

tech-stack:
  added: []
  patterns:
    - "Image.PreviewGroup bọc lưới ImageTile — bấm phóng to tại chỗ, qua lại giữa ảnh cùng mã, không rời màn (D-16)"
    - "Lỗi mutation ảnh hợp nhất qua explainMutationError/explainUploadError: ImageProcessingError/ImageRequestError lấy title/action trực tiếp, còn lại qua explainError() dùng chung"

key-files:
  created:
    - src/features/images/components/image-upload-button.tsx
    - src/features/images/components/image-tile.tsx
    - src/features/images/components/product-image-gallery.tsx
  modified:
    - src/features/products/components/product-detail.tsx
    - "src/app/(app)/danh-muc/[id]/page.tsx"

key-decisions:
  - "explainError() và errorCode()/isPostgrestError() trong src/shared/lib/errors.ts đã ở tên tiếng Anh (khác ví dụ maLoi/laLoiPostgrest cũ trong CLAUDE.md) — dùng đúng API hiện tại của repo, không đoán tên cũ"

requirements-completed: [ANH-01, ANH-02, ANH-03]

duration: ~25min
completed: 2026-09-26
---

# Phase 9 Plan 10: Thư viện ảnh trong chi tiết mã hàng Summary

**Ba component mới (nút chụp/chọn ảnh với hàng đợi tuần tự, ô ảnh, thư viện ảnh 4 trạng thái) ghép vào chi tiết mã hàng qua slot `imagesSection` — quản lý/văn phòng thêm, đặt ảnh chính, xóa ảnh; mọi vai trò xem và phóng to qua lại giữa ảnh của mã.**

## Bối cảnh worktree

`git merge main --ff-only` thành công ngay khi bắt đầu, kéo về Wave 1–3 của Phase 9
(migration 0068, `database.types.ts` có bảng `hinh_anh`, lớp storage server-only,
route `/api/anh/*`, và lớp dữ liệu client `useProductImages`/`image.api.ts` từ 09-03/09-07).
Không có xung đột file với 09-11 (products/types.ts, product.api.ts, product-columns.tsx
không bị đụng).

## Task Commits

1. **Task 1: ImageUploadButton — chụp/chọn nhiều ảnh, hàng đợi từng file** — `1033268`
2. **Task 2: ImageTile + ProductImageGallery + gắn vào chi tiết mã** — `8fcc68d`

## Accomplishments

- `image-upload-button.tsx`: hai input file ẩn (camera `capture="environment"`,
  file `multiple`), mở bằng `ref.current?.click()` trong handler click (không
  trong render). Hàng đợi xử lý TUẦN TỰ (`for` + `await mutateAsync`) — ảnh đầu
  tiên của mã chưa có ảnh thành ảnh chính đúng thứ tự người chọn. `checkPickedFile`
  chạy trước khi gửi để đánh dấu lỗi ngay, không gọi mạng cho file rõ ràng sai;
  lỗi khác bắt riêng `ImageProcessingError`/`ImageRequestError` (lấy `title/action`
  trực tiếp) hoặc `explainError()` cho lỗi lạ. Một file lỗi không dừng các file
  sau. Hết lô có lỗi: `notification.warning({ title, description })` theo đúng
  khuôn `App.useApp()` đang dùng trong `user-drawer.tsx`/`product-drawer.tsx`
  (không dùng `message:`).
- `image-tile.tsx`: antd `Image` `src=imageUrl(id,"thumb")` `preview={{ src: imageUrl(id) }}`,
  tag "Ảnh chính" khi `isPrimary`, nút "Đặt làm ảnh chính" (ẩn khi đã chính) +
  `Popconfirm` bọc nút "Xóa" (`danger`), cả hai `disabled={busy}`.
- `product-image-gallery.tsx`: tiêu đề "Hình ảnh" + `ImageUploadButton` (chỉ khi
  `canEdit`) đặt NGOÀI `QueryState` để trạng thái rỗng vẫn thêm được ảnh ngay.
  `QueryState` đủ 4 trạng thái (skeleton `Skeleton.Image`, lỗi có nút Thử lại từ
  `QueryState` sẵn có, rỗng có câu hướng dẫn khác nhau theo quyền, có dữ liệu).
  `Image.PreviewGroup` bọc lưới `ImageTile` — bấm một ảnh phóng to tại chỗ, mũi
  tên qua lại giữa ảnh của mã (D-16). Xóa ảnh mà `driveTrashed === false` báo
  `notification.warning` riêng; lỗi mutation báo `notification.error({ title, description })`.
- `product-detail.tsx`: thêm prop `imagesSection?: ReactNode` theo đúng khuôn
  `kiotVietHistoryTab` (route ghép sẵn, feature `products` không import feature
  `images` trực tiếp), render ngay sau `Descriptions`, trước "Tồn theo kho".
- Route `/danh-muc/[id]/page.tsx`: import `ProductImageGallery` từ
  `@/features/images/components/product-image-gallery`, truyền
  `productId={id}` + `canEdit={hasPermission(user.role, "edit-catalog")}`.

## Files Created/Modified
- `src/features/images/components/image-upload-button.tsx` - nút Chụp ảnh/Chọn ảnh + hàng đợi
- `src/features/images/components/image-tile.tsx` - ô ảnh + đặt ảnh chính/xóa
- `src/features/images/components/product-image-gallery.tsx` - mục Hình ảnh 4 trạng thái
- `src/features/products/components/product-detail.tsx` - thêm slot `imagesSection`
- `src/app/(app)/danh-muc/[id]/page.tsx` - ghép `ProductImageGallery` vào route

## Decisions Made

`src/shared/lib/errors.ts` hiện tại xuất `explainError()`/`errorCode()`/`isPostgrestError()`
(tên tiếng Anh) thay vì `explainError()`/`maLoi()`/`laLoiPostgrest()` như ví dụ cũ
trong CLAUDE.md bẫy 8 — đã đọc file thật trước khi dùng, không đoán theo tên cũ.
Không đổi hành vi, chỉ dùng đúng API hiện có.

## Deviations from Plan

None — plan thực thi đúng như văn bản. Cả hai gate `<verify><automated>` của Task 1
và Task 2 đều xanh ngay lần chạy đầu.

## Issues Encountered

None.

## User Setup Required

None - không cần cấu hình dịch vụ ngoài nào ở plan này (Apps Script/Drive đã có
từ 09-06/09-09, plan này chỉ ghép giao diện gọi hook có sẵn).

## Verification

- `npm run typecheck` xanh sau cả hai task.
- `npm run lint` xanh sau cả hai task.
- Gate tự động Task 1: `"use client"` dòng 1, có `capture="environment"`,
  `ACCEPT_ATTRIBUTE`, `mutateAsync`, không `image/*`, file 182 dòng (≤220) → OK.
- Gate tự động Task 2: `imagesSection` có trong `product-detail.tsx`,
  `ProductImageGallery` có trong route, `Image.PreviewGroup` + `QueryState` có
  trong `product-image-gallery.tsx`, file 105 dòng (≤200) → OK.
- Acceptance criteria bổ sung: `grep -rn "visible\b|onVisibleChange|message:"` và
  `grep -rn "\"/anh/"` trong `src/features/images/components` đều rỗng (không prop
  antd v5 đã bỏ, không viết tay URL `/anh/`).
- **Không chạy được** `npm run build`/`npm run dev` trong worktree này (Turbopack +
  symlinked `node_modules`, theo đúng chỉ dẫn `parallel_execution`) — build thật và
  kiểm mắt trên trình duyệt (mở `/danh-muc/<id>` bằng tài khoản quanly, xem console)
  **hoãn lại cho orchestrator** sau khi merge, và cho 09-13 (UAT toàn phase, cần Apps
  Script đã deploy để tải ảnh thật).

## Known Stubs

Không có stub — cả ba component đều là UI hoàn chỉnh, gọi thẳng hook đã hiện thực
đầy đủ ở 09-07. Chưa kiểm chứng bằng ảnh thật trên trình duyệt (deferred ở trên),
nhưng không có dữ liệu giả/hardcode nào trong code.

## Next Phase Readiness

- Chi tiết mã hàng đã có mục "Hình ảnh" đầy đủ luồng thêm/xem/đặt ảnh
  chính/xóa theo đúng quyền `edit-catalog`; sẵn sàng cho 09-13 kiểm mắt toàn
  phase trên trình duyệt thật.
- 09-11 (cột thumbnail bảng danh mục) không bị chặn — không đụng file nào của
  plan này.

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: src/features/images/components/image-upload-button.tsx
- FOUND: src/features/images/components/image-tile.tsx
- FOUND: src/features/images/components/product-image-gallery.tsx
- FOUND commit: 1033268
- FOUND commit: 8fcc68d
