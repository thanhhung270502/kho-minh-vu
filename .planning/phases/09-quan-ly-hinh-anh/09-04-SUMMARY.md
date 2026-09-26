---
phase: 09-quan-ly-hinh-anh
plan: 04
subsystem: lop luu tru anh (Google Drive qua Apps Script)
tags: [images, storage, apps-script, server-only]
dependency_graph:
  requires: []
  provides:
    - "src/features/images/lib/storage/image-storage.ts (interface ImageStorage, ImageStorageError)"
    - "src/features/images/lib/storage/gdrive-storage.server.ts (GDriveImageStorage)"
    - "src/features/images/lib/storage/index.server.ts (getImageStorage())"
    - "src/lib/env-server.ts getAppsScriptEnv()"
  affects:
    - "09-06, 09-09 (Route Handler /anh/[id] va upload) se goi getImageStorage()"
    - "09-12 (script chep anh KiotViet) se tu dung GDriveImageStorage truc tiep"
tech_stack:
  added: []
  patterns:
    - "Interface ImageStorage che giau backend luu tru (D-10) — doi sang Supabase/R2 sau chi them 1 class"
    - "Loi nghiep vu Apps Script (ok:false, HTTP 200) duoc phan loai qua ImageStorageError.kind, khong dua vao res.ok (Pitfall 4)"
    - "Doc anh dung Next Data Cache (force-cache + next.tags) khi co cacheTag, ghi/xoa luon no-store"
key_files:
  created:
    - src/features/images/lib/storage/image-storage.ts
    - src/features/images/lib/storage/gdrive-storage.server.ts
    - src/features/images/lib/storage/index.server.ts
    - scripts/test-image-storage.ts
  modified:
    - src/lib/env-server.ts
    - .env.example
decisions:
  - "Khong dua StorageBackend vao import cua index.server.ts khi khong dung truc tiep (chi re-export) — tranh unused import"
  - "remove() coi loi not_found tu Apps Script la thanh cong (da xoa = muc tieu dat, D-21)"
metrics:
  duration: "~30 phut"
  completed: "2026-09-26"
---

# Phase 9 Plan 04: Lớp lưu trữ ảnh (Google Drive qua Apps Script) Summary

Dựng interface `ImageStorage` (put/get/remove) và bản cài đặt `GDriveImageStorage` gọi
một Apps Script web app qua HTTP, che giấu toàn bộ chi tiết Google Drive sau một lớp
duy nhất — D-10, ANH-05.

## Đã làm

**Task 1 — `image-storage.ts` + `gdrive-storage.server.ts` (TDD, test trước):**
- `image-storage.ts`: interface thuần `ImageStorage`, `ImageStorageError` (kind:
  `forbidden | bad_request | not_found | unavailable`), `StorageBackend = "GDRIVE"`,
  `ImageVariant = "full" | "thumb"`.
- `gdrive-storage.server.ts`: `GDriveImageStorage implements ImageStorage`. Hàm `call()`
  riêng gửi POST JSON `{secret, action, ...}`, luôn kiểm `ok:false` trong body TRƯỚC khi
  coi là thành công (Apps Script luôn trả HTTP 200 — Pitfall 4), parse bằng zod thay vì
  `any`. `put` map `variant` → folder (`san-pham/goc` / `san-pham/thumb`), gửi base64,
  luôn `cache: "no-store"`. `get` dùng `cache: "force-cache"` + `next.tags` khi có
  `cacheTag` (D-23), ngược lại `no-store`. `remove` coi lỗi `not_found` là đã đạt mục
  tiêu (resolve thay vì throw).
- KHÔNG import gói chặn build ngoài `react-server` trong file này — `scripts/test-image-storage.ts`
  và script chép ảnh KiotViet (09-12) cần import trực tiếp ngoài Next.js.
- `scripts/test-image-storage.ts`: fetch giả ghi lại request, 13 case phủ toàn bộ
  `<behavior>` của plan (put full/thumb, lỗi forbidden/not_found, HTTP 500, JSON hỏng,
  fetch ném lỗi mạng, get thành công + giải mã base64, get có/không cacheTag, remove
  thành công + remove not_found).

**Task 2 — Factory server-only + biến môi trường:**
- `src/lib/env-server.ts` thêm `getAppsScriptEnv()`: đọc lười `APPS_SCRIPT_URL` (phải
  kết thúc `/exec`) và `APPS_SCRIPT_SECRET` (tối thiểu 16 ký tự) bằng zod, dùng `||`
  chứ không `??` (bẫy 17), thông điệp lỗi tiếng Việt trỏ tới `apps-script/README.md`.
- `src/features/images/lib/storage/index.server.ts`: `import "server-only"`, factory
  `getImageStorage(backend?)` — undefined hoặc `"GDRIVE"` → `new GDriveImageStorage(...)`,
  giá trị khác → `ImageStorageError("bad_request", ...)`. Đây là chỗ DUY NHẤT chọn
  implementation theo `hinh_anh.noi_luu`.
- `.env.example` thêm mục 6 (`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`), ghi rõ tuyệt đối
  không `NEXT_PUBLIC_*`.

## Xác minh

- `npx tsx scripts/test-image-storage.ts` → `✓ test-image-storage: 13 case`, thoát mã 0.
- `npm run typecheck` xanh toàn bộ repo (không chỉ file mới).
- `npx eslint .` sạch, không cảnh báo.
- Grep tĩnh ANH-05: `grep -rlnE "APPS_SCRIPT|DriveApp|GDRIVE" src/ | grep -v "features/images/lib/storage" | grep -v "src/lib/env-server.ts"` → rỗng (đúng yêu cầu, mọi nơi biết tới Apps Script/Drive nằm trong hai chỗ này).
- `grep -q "force-cache" gdrive-storage.server.ts` → có.
- `! grep -q "server-only\|next/cache" gdrive-storage.server.ts` → đúng (file không import hai thứ đó).
- `grep -q "import \"server-only\"" index.server.ts` → có.
- Không `any`, không `console.log` trong hai file storage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment trong `gdrive-storage.server.ts` tự chứa chuỗi bị chính gate cấm**
- **Found during:** Task 1, chạy grep acceptance criteria `! grep -q "server-only\|next/cache"`.
- **Issue:** Comment đầu file giải thích "KHÔNG `import "server-only"`" và nhắc lại từ
  "server-only" hai lần nữa — khớp literal với chính pattern grep cấm, dù ý nghĩa là
  giải thích lý do KHÔNG import, không phải import thật.
- **Fix:** Viết lại đoạn comment, thay "server-only" bằng diễn đạt khác ("gói chặn build
  ngoài react-server", "hàng rào chỉ chạy ở server") — giữ nguyên ý nghĩa, không còn
  literal string bị cấm.
- **Files modified:** `src/features/images/lib/storage/gdrive-storage.server.ts`.
- **Commit:** gộp vào `afe8395` (sửa trước khi commit, không phải commit riêng).

## Known Stubs

Không có. Cả hai file storage và factory đều là implementation thật (không mock/stub),
chỉ chưa có nơi gọi (Route Handler 09-06/09-09, script 09-12 — các plan sau của Phase 9).

## Ghi chú môi trường thực thi (không phải deviation code)

`npm run build` (Turbopack) văng `TurbopackInternalError: Symlink [project]/node_modules
is invalid, it points out of the filesystem root` trong worktree này — do `node_modules`
được symlink từ checkout chính ra ngoài root filesystem của worktree (theo đúng hướng dẫn
môi trường thực thi song song), không liên quan tới code của plan này. `npm run typecheck`
và `npx eslint .` (không đi qua Turbopack) đều xanh. Người merge cần tự chạy `npm run build`
thật trên checkout chính (không symlink) trước khi coi wave này là xong.

## Self-Check: PASSED

- `src/features/images/lib/storage/image-storage.ts` — FOUND
- `src/features/images/lib/storage/gdrive-storage.server.ts` — FOUND
- `src/features/images/lib/storage/index.server.ts` — FOUND
- `scripts/test-image-storage.ts` — FOUND
- Commit `afe8395` — FOUND (`git log --oneline --all | grep afe8395`)
- Commit `e7e649e` — FOUND (`git log --oneline --all | grep e7e649e`)
