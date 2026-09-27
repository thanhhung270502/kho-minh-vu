---
phase: 09-quan-ly-hinh-anh
plan: 06
subsystem: duong doc anh (Route Handler + lop server)
tags: [images, route-handler, cache, proxy, hinh-anh]

requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "src/features/images/lib/storage (09-04), migration 0068 + database.types.ts (09-05)"
provides:
  - "src/features/images/api/image.server.ts (fetchImageKeys, fetchProductCode, insertImageRecord, softDeleteImage)"
  - "src/app/anh/[id]/route.ts — GET trả binary ảnh, cache private theo D-23"
  - "src/proxy.ts chặn /anh/ chưa đăng nhập bằng JSON 401"
affects: [09-07, 09-08, 09-09, 09-10]

tech-stack:
  added: []
  patterns:
    - "Lớp server *.server.ts là nơi DUY NHẤT chạm tên cột hinh_anh/san_pham — route chỉ thấy kiểu camelCase (StoredImageKeys)"
    - "revalidateTag(tag, { expire: 0 }) ngay trong nhánh ImageStorageError — response ok:false của Apps Script là HTTP 200 nên có thể đã vào Data Cache"
    - "Response body Uint8Array<ArrayBufferLike> không khớp thẳng BodyInit của undici types — bọc Buffer.from(bytes) thay vì ép kiểu any"

key-files:
  created:
    - src/features/images/api/image.server.ts
    - src/app/anh/[id]/route.ts
  modified:
    - src/proxy.ts

key-decisions:
  - "P0002 (RPC xoa_anh báo ảnh đã xóa/không tồn tại) map về null trong softDeleteImage, không throw — route gọi hàm này (09-09) tự quyết định 404 thay vì 500"
  - "Body response dùng Buffer.from(image.bytes) thay vì Blob([image.bytes]): Uint8Array<ArrayBufferLike> không assignable cho BlobPart (đòi ArrayBufferView<ArrayBuffer>); Buffer.from tạo bản sao thỏa NodeJS.ArrayBufferView mà không cần as any"

requirements-completed: []
requirements-partial: [ANH-03, ANH-05]

duration: ~30min
completed: 2026-09-26
---

# Phase 9 Plan 06: Đường ĐỌC ảnh — image.server.ts + Route /anh/[id] Summary

Route Handler `GET /anh/[id]` trả binary ảnh (gốc hoặc thumb qua `?co=nho`) sau khi `getUser()` xác thực, đọc khóa lưu qua RPC `lay_khoa_anh` bằng lớp server dùng chung `image.server.ts`, cache `private, max-age=31536000, immutable` (không `public`/`s-maxage`, D-23) — kèm chặn chưa đăng nhập ở `src/proxy.ts` cho toàn bộ `/anh/`.

## Đã làm

**Task 1 — `image.server.ts`:** 4 hàm (`fetchImageKeys`, `fetchProductCode`, `insertImageRecord`, `softDeleteImage`) mỗi hàm tự `await createSupabaseServerClient()` (không cache biến module). `fetchImageKeys`/`softDeleteImage` gọi RPC `lay_khoa_anh`/`xoa_anh`, map dòng đầu snake_case → `StoredImageKeys` camelCase; `fetchProductCode` chỉ `select("ma_hang")` (bẫy 5, `san_pham` không có SELECT mức bảng); `insertImageRecord` gọi `them_anh` trả `{ isPrimary: data === true }`. `softDeleteImage` bắt riêng `error.code === "P0002"` → null (ảnh đã xóa/không tồn tại), lỗi khác throw.

**Task 2 — Route `/anh/[id]` + proxy:** `runtime = "nodejs"` (Apps Script qua storage layer cần Node). Luồng: regex UUID → 404 nếu sai; `getUser()` (không `getSession()`) → 401 nếu chưa đăng nhập; đọc `?co=nho` qua `THUMB_PARAM` để chọn `full`/`thumb`; `fetchImageKeys` trong try/catch (`explainError` → 403 nếu forbidden, 500 khác) → 404 nếu null; `getImageStorage(keys.backend).get(key, { cacheTag: \`anh-${id}-${size}\` })`; bắt `ImageStorageError` → LUÔN `revalidateTag(tag, { expire: 0 })` trước khi trả 404 (`not_found`) hoặc 502 (khác); thành công → `Response` với header `Content-Type`, `Cache-Control: private, max-age=31536000, immutable`, `Server-Timing: storage;dur=…` (đo hiệu năng cache lần hai), `X-Content-Type-Options: nosniff`. `src/proxy.ts`: điều kiện nhánh JSON 401 mở rộng từ `pathname.startsWith("/api/")` thành `|| pathname.startsWith("/anh/")`, kèm comment lý do (`<img>` không theo được redirect HTML).

## Xác minh

- `npm run typecheck` xanh toàn repo (cả hai task, sau khi sửa kiểu body response).
- `npm run lint` (eslint) sạch, không cảnh báo.
- Grep acceptance Task 1: `import "server-only"`, `lay_khoa_anh`, `select("ma_hang")` — cả ba khớp.
- Grep acceptance Task 2: header `private, max-age=31536000, immutable` có; không còn `s-maxage`/`CDN-Cache-Control`/`"public` trong file (sau khi sửa comment — xem Deviations); `getUser()` có, `getSession` không có; `revalidateTag(tag, { expire: 0 })` có; `startsWith("/anh/")` có trong `proxy.ts`.
- Grep tĩnh ANH-05: `grep -rlnE "APPS_SCRIPT|DriveApp|GDRIVE" src/ | grep -v "features/images/lib/storage" | grep -v "src/lib/env-server.ts"` → rỗng (route chỉ gọi `getImageStorage`, không tự biết Apps Script/Drive).
- `git status --short` trước mỗi commit: không có `node_modules`/`.env.local` symlink lọt vào staging.
- **Không chạy được `curl` kiểm 401 thật** — `npm run dev` (Turbopack) văng `TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`, đúng hạn chế đã ghi ở 09-04-SUMMARY (`node_modules` symlink từ checkout chính ra ngoài root filesystem của worktree). Không liên quan tới code của plan này — người merge trên checkout chính cần tự `npm run dev`/`npm run build` và curl `http://localhost:3000/anh/00000000-0000-4000-8000-000000000000` (kỳ vọng `401` khi chưa có cookie) trước khi coi wave 3 là xong.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment giải thích lý do KHÔNG dùng `public`/`s-maxage` tự chứa chuỗi bị chính gate cấm**
- **Found during:** Task 2, chạy grep acceptance criteria `! grep -qE "s-maxage|CDN-Cache-Control|\"public"`.
- **Issue:** Comment cạnh header `Cache-Control` viết `` `public`/`s-maxage` `` để giải thích D-23 — khớp literal với chính pattern grep cấm (giống deviation 1 của 09-04-SUMMARY, cùng dạng bẫy).
- **Fix:** Viết lại comment, thay cụm `` `public`/`s-maxage` `` bằng "directive cache dùng cho response chia sẻ" — giữ nguyên ý nghĩa, không còn literal string bị cấm.
- **Files modified:** `src/app/anh/[id]/route.ts`.
- **Commit:** sửa trước khi commit Task 2 (`aa68daa`), không tạo commit riêng.

**2. [Rule 3 - Blocking] `Response` body không nhận thẳng `Uint8Array` hoặc `Blob([bytes])`**
- **Found during:** Task 2, `npm run typecheck`.
- **Issue:** `image.bytes` có kiểu `Uint8Array<ArrayBufferLike>` (từ interface `ImageStorage.get` ở 09-04, không tham số hóa generic). `new Response(image.bytes, …)` báo lỗi `BodyInit` (undici types) không khớp; đổi sang `new Blob([image.bytes], { type })` như gợi ý trong plan cũng lỗi tương tự ở `BlobPart` (đòi `ArrayBufferView<ArrayBuffer>`, không nhận `ArrayBufferLike` vì bao gồm cả `SharedArrayBuffer`).
- **Fix:** `Buffer.from(image.bytes)` — tạo bản sao Buffer thỏa `NodeJS.ArrayBufferView`, không cần ép kiểu `as any`. Không sửa interface `ImageStorage` (ngoài phạm vi file được phép sửa của Task 2).
- **Files modified:** `src/app/anh/[id]/route.ts`.
- **Commit:** gộp vào `aa68daa`.

### Auth gates

Không có.

## Known Stubs

Không có — cả hai file là code thật (không mock/placeholder). Chưa có nơi gọi `insertImageRecord` (thuộc route upload 09-09) — đúng phạm vi plan này chỉ dựng đường ĐỌC.

## Ghi chú môi trường thực thi (không phải deviation code)

`npm run dev`/`npm run build` (Turbopack) không chạy được trong worktree này do `node_modules` symlink trỏ ra ngoài filesystem root của worktree — lặp lại đúng hạn chế đã ghi trong `09-04-SUMMARY.md`. `npm run typecheck` + `npm run lint` (không qua Turbopack) đều xanh và được dùng thay thế theo đúng hướng dẫn `parallel_execution`. Người merge trên checkout chính (không symlink) cần tự chạy `npm run build` thật + curl 401 trước khi coi wave 3 hoàn tất.

## Self-Check: PASSED

- `src/features/images/api/image.server.ts` — FOUND
- `src/app/anh/[id]/route.ts` — FOUND
- `src/proxy.ts` (đã sửa) — FOUND
- Commit `0f421aa` (feat(anh): lop server hinh_anh) — FOUND
- Commit `aa68daa` (feat(anh): route /anh/[id] doc anh qua lop storage, cache private) — FOUND
