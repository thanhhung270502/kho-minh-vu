---
phase: 09-quan-ly-hinh-anh
plan: 03
subsystem: images
tags: [webp, canvas, image-compression, pure-functions]

# Dependency graph
requires: []
provides:
  - "src/features/images/lib/image-rules.ts — hằng số nén/kích thước, scaleToFit, checkPickedFile, safeFileStem, isWebp"
  - "src/features/images/lib/image-url.ts — imageUrl(id, size) sinh /anh/<id> hoặc /anh/<id>?co=nho"
  - "src/features/images/lib/compress-image.ts — compressImage(file) nén WebP full+thumb bằng Canvas"
affects: [09-04, 09-05, 09-06, 09-07, phase-9-images-upload]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature lib thuần (không use client, không alias @/) dùng chung server + script tsx + trình duyệt"
    - "canvas.toBlob callback bất đồng bộ dùng reject() thay vì throw() trong Promise executor"

key-files:
  created:
    - src/features/images/lib/image-rules.ts
    - src/features/images/lib/image-url.ts
    - src/features/images/lib/compress-image.ts
  modified:
    - scripts/test-pure-functions.ts

key-decisions:
  - "ACCEPT_ATTRIBUTE không liệt kê image/heic để iOS tự đổi HEIC sang JPEG khi chọn ảnh"
  - "canvas.toBlob dùng reject() thay vì throw() trong callback — throw trong callback bất đồng bộ không reject được Promise bọc ngoài (lệch nhẹ so với chữ 'throw' trong plan, cùng ý nghĩa nghiệp vụ)"

patterns-established:
  - "lib/ thuần cho ảnh: mọi quy tắc kích thước/định dạng chỉ ở image-rules.ts, dùng lại ở compress-image.ts (trình duyệt), Route Handler kiểm lại (plan sau), và script chép ảnh KiotViet"

requirements-completed: [ANH-01]

duration: 15min
completed: 2026-09-26
---

# Phase 9 Plan 03: Quy tắc nén ảnh + URL /anh + hàm nén WebP Summary

**Ba hàm thuần (scaleToFit/checkPickedFile/safeFileStem/isWebp/imageUrl) và một hàm nén ảnh trình duyệt (Canvas → WebP full 1200px + thumb 300px) làm nền cho toàn bộ luồng ảnh mã hàng của Phase 9.**

## Performance

- **Duration:** ~15 phút
- **Tasks:** 2 (cả hai autonomous, không checkpoint)
- **Files modified:** 4 (3 file mới + 1 file test)

## Accomplishments
- `image-rules.ts`: hằng số kích thước/chất lượng/giới hạn byte, `scaleToFit` (không phóng to ảnh nhỏ), `checkPickedFile` (chặn HEIC/rỗng/quá 30MB/sai định dạng với câu tiếng Việt + hướng dẫn), `safeFileStem` (tên file Drive an toàn), `isWebp` (đọc magic byte RIFF/WEBP)
- `image-url.ts`: `imageUrl(id, size)` — một hàm duy nhất sinh `/anh/<id>` hoặc `/anh/<id>?co=nho`, component/hook không biết nơi lưu ảnh
- `compress-image.ts`: `compressImage(file)` nén ảnh phía trình duyệt bằng `createImageBitmap` + Canvas + `toBlob("image/webp")`, tự thử chất lượng thấp hơn khi vượt giới hạn byte, kiểm `blob.type` vì `toBlob` âm thầm trả PNG khi trình duyệt không mã hóa được WebP
- 16 case TDD mới trong `scripts/test-pure-functions.ts`, xác nhận RED trước khi viết hàm rồi GREEN sau khi viết xong

## Task Commits

Each task was committed atomically:

1. **Task 1: image-rules.ts + image-url.ts (hàm thuần, có test)** - `33a7429` (test)
2. **Task 2: compress-image.ts — nén WebP + thumb bằng Canvas** - `4437b5b` (feat)

_Plan này không tạo commit metadata riêng — SUMMARY.md sẽ được orchestrator gộp khi merge wave (agent thực thi song song, không cập nhật STATE.md/ROADMAP.md theo ràng buộc parallel_execution)._

## Files Created/Modified
- `src/features/images/lib/image-rules.ts` - hằng số + 5 hàm thuần quy tắc ảnh
- `src/features/images/lib/image-url.ts` - `imageUrl()` + `THUMB_PARAM`
- `src/features/images/lib/compress-image.ts` - `compressImage()` + `ImageProcessingError`
- `scripts/test-pure-functions.ts` - thêm khối `// --- Ảnh mã hàng: quy tắc nén và URL (09-03) ---` (16 assertion)

## Decisions Made
- `ACCEPT_ATTRIBUTE` cố tình không liệt kê `image/heic` (research Pitfall 5: iOS tự đổi HEIC → JPEG khi `accept` không có HEIC)
- `canvas.toBlob` callback dùng `reject()` thay vì `throw()` như văn bản plan gợi ý theo nghĩa đen — throw trong callback bất đồng bộ (không nằm trong pha đồng bộ của Promise executor) sẽ trở thành exception không bắt được, không reject Promise bọc ngoài. Đây là điều chỉnh kỹ thuật bắt buộc để hành vi đúng như plan mô tả (lỗi phải reject ra ngoài để `compressImage` bắt được), không đổi thông điệp lỗi hay luồng nghiệp vụ.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] canvas.toBlob dùng reject() thay vì throw() trong callback**
- **Found during:** Task 2 (viết compress-image.ts, review lại luồng Promise trước khi chạy typecheck)
- **Issue:** Văn bản plan viết `!blob || blob.type !== "image/webp"` → `throw`. Nhưng callback của `canvas.toBlob` chạy bất đồng bộ (ngoài pha đồng bộ của `new Promise((resolve) => {...})`), nên `throw` bên trong sẽ không reject được Promise — trở thành lỗi không bắt được, Promise treo mãi (không resolve, không reject)
- **Fix:** Đổi `new Promise((resolve) => ...)` thành `new Promise((resolve, reject) => ...)`, gọi `reject(new ImageProcessingError(...))` thay vì `throw`
- **Files modified:** `src/features/images/lib/compress-image.ts`
- **Verification:** `npm run typecheck` xanh, không còn nhánh nào throw trong callback bất đồng bộ
- **Committed in:** `4437b5b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1)
**Impact on plan:** Sửa cần thiết để đúng hành vi plan mô tả (lỗi phải truyền ra được cho `compressImage` bắt). Không đổi thông điệp lỗi, không đổi acceptance criteria (`grep -q 'blob.type !== "image/webp"'` vẫn khớp).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. `compressImage` chỉ dùng Canvas API của trình duyệt, chưa gọi Apps Script/Drive (việc của plan sau, 09-07).

## Next Phase Readiness
- `image-rules.ts`/`image-url.ts`/`compress-image.ts` sẵn sàng cho: hook upload trình duyệt (09-07), Route Handler kiểm lại ảnh trước khi gửi Apps Script, script chép ảnh KiotViet (dùng `safeFileStem`/`isWebp`)
- Chưa kiểm bằng mắt trên trình duyệt thật (Canvas/`createImageBitmap` cần DOM) — `compressImage` chỉ được xác nhận qua `npm run typecheck` + `npm run lint`, chưa có test runtime nào gọi hàm này (đúng phạm vi Task 2, không có `<verify><automated>` runtime cho hàm cần DOM). UAT thật sự chỉ làm được khi hook 09-07 ghép vào giao diện chọn ảnh.

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: src/features/images/lib/image-rules.ts
- FOUND: src/features/images/lib/image-url.ts
- FOUND: src/features/images/lib/compress-image.ts
- FOUND commit: 33a7429
- FOUND commit: 4437b5b
