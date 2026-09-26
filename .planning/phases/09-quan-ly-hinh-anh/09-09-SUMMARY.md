---
phase: 09-quan-ly-hinh-anh
plan: 09
subsystem: route ghi anh (Route Handler tai-len/xoa) + ma tran quyen route
tags: [images, route-handler, permissions, hinh-anh]

requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "src/features/images/api/image.server.ts (09-06), lop storage (09-04), image-rules.ts (09-03)"
provides:
  - "src/app/api/anh/tai-len/route.ts — POST multipart san_pham_id/goc/nho -> {id, isPrimary}"
  - "src/app/api/anh/xoa/route.ts — POST JSON {id} -> {driveTrashed}"
  - "scripts/test-route-permissions.ts — kiemAnh(): GET /anh/<uuid>, POST tai-len, POST xoa cho 4 vai tro + khach"
affects: [09-10, 09-11, 09-13]

tech-stack:
  added: []
  patterns:
    - "Route ghi anh theo dung khuon nhap-excel/route.ts: errorResponse(title, action, status), thu tu 401 -> 403 -> doc body -> kiem -> goi, explainError(e) map ve status"
    - "Bu tru storage.remove(key).catch(() => undefined) o ca hai nhanh loi (thumb loi sau khi goc da len; DB loi sau khi ca hai da len) — khong de file mo coi tren Drive"
    - "Xoa anh: DB xoa mem truoc (nguon su that), Promise.allSettled cho ca hai storage.remove — Drive loi khong hoi lai ban ghi da xoa, chi bao that qua driveTrashed"

key-files:
  created:
    - src/app/api/anh/tai-len/route.ts
    - src/app/api/anh/xoa/route.ts
  modified:
    - scripts/test-route-permissions.ts

key-decisions:
  - "Thong diep loi 502 khi ImageStorageError kind=forbidden doi tu 'bao quan tri kiem tra APPS_SCRIPT_SECRET' sang cau khong chua chuoi APPS_SCRIPT_SECRET — gate tu dong cua chinh task nay cam moi xuat hien APPS_SCRIPT/GDRIVE trong file (dung mo hinh deviation da gap o 09-06/09-07)"
  - "kiemAnh() dang nhap bang phien quan ly de tim mot id anh that (RLS hinh_anh chi cho doc khi da dang nhap) thay vi dung client an danh nhu ban nhap dau — tranh false negative do RLS chan"

requirements-completed: [ANH-01, ANH-02, ANH-03]

duration: ~45min
completed: 2026-09-26
---

# Phase 9 Plan 09: Route ghi ảnh (tải lên/xóa) + ma trận quyền ba route ảnh Summary

Hai Route Handler ghi ảnh (`POST /api/anh/tai-len`, `POST /api/anh/xoa`) dựng đúng khuôn `nhap-excel/route.ts` và khớp hợp đồng đã chốt trong `src/features/images/api/image.api.ts` (09-07): kiểm quyền edit-catalog ở server (401 → 403, không tin client), kiểm lại kích thước + magic bytes WebP của ảnh đã nén, bù trừ `storage.remove` để không để file mồ côi trên Drive khi một bước sau đó lỗi, và xóa mềm DB trước rồi mới dọn file Drive (Promise.allSettled, báo thật `driveTrashed` thay vì nuốt lỗi). `scripts/test-route-permissions.ts` thêm hàm `kiemAnh()` phủ cả ba route ảnh (`/anh/[id]`, hai route ghi) vào ma trận quyền.

## Task Commits

1. **Task 1: POST /api/anh/tai-len** — `1be8c33`
2. **Task 2: POST /api/anh/xoa + kiemAnh() trong test-route-permissions.ts** — `fe7b340`

## Đã làm

**Task 1 — `tai-len/route.ts`:** `runtime = "nodejs"`, `maxDuration = 60`. Thứ tự: `getCurrentUser()` null → 401; `!hasPermission(user.role, "edit-catalog")` → 403; `request.formData()` trong try/catch → 400; đọc `san_pham_id` (regex UUID), `goc`/`nho` (`instanceof Blob` — `File` cũng là `Blob` nên bao trùm cả hai) thiếu/sai → 400; size vượt `MAX_FULL_BYTES`/`MAX_THUMB_BYTES` → 413; `isWebp` một trong hai bytes sai → 422; `fetchProductCode` null → 404; sinh `id = crypto.randomUUID()`, `fileName = safeFileStem(code)__id.webp`; `storage.put` ảnh gốc rồi thumb — thumb lỗi thì `storage.remove(key)` (bù trừ, bỏ qua lỗi bù trừ, có comment) rồi trả lỗi qua `storageErrorResponse` (502, nhánh `kind === "forbidden"` có câu riêng không lộ tên biến môi trường); `insertImageRecord` lỗi thì bù trừ cả hai file rồi map `explainError` → 403/404/422/500. Thành công trả `{ id, isPrimary }`.

**Task 2 — `xoa/route.ts` + `kiemAnh()`:** `xoa/route.ts` cùng khuôn 401/403 (thông điệp "Tài khoản không có quyền xóa ảnh"); `request.json()` try/catch → 400; `id` không đúng UUID → 400; `softDeleteImage(id)` lỗi → `explainError` (403/500), null → 404 ("Ảnh không tồn tại hoặc đã bị xóa"); `Promise.allSettled([storage.remove(key), storage.remove(thumbKey)])` → `driveTrashed = cả hai fulfilled`; trả `{ driveTrashed }` — comment giải thích tại sao không cần `revalidateTag` riêng (route đọc `/anh/[id]` đã 404 ngay vì RPC `lay_khoa_anh` lọc ảnh đã xóa mềm ở tầng DB). `test-route-permissions.ts` thêm `kiemAnh(cookie)`: (1) `GET /anh/00000000-0000-4000-8000-000000000000` — 4 vai trò 404, khách 401; (2) nếu có ảnh thật (đăng nhập bằng phiên quản lý để vượt RLS tìm một `id`), kiểm `GET /anh/<id>` và `GET /anh/<id>?co=nho` — 4 vai trò 200, khách 401, không có ảnh thì `console.warn` và bỏ qua; (3) `POST /api/anh/tai-len` FormData rỗng — quanly/vanphong 400, thukho1/chixem 403, khách 401; (4) `POST /api/anh/xoa` JSON rỗng — cùng kỳ vọng như (3). Gọi và cộng dồn `tong`/`lech` trong `main()` đúng khuôn `kiemNapTamPost`/`kiemKiemKeExcel`.

## Xác minh

- `npm run typecheck` xanh sau cả hai task.
- `npx eslint <file>` (và `npm run lint` toàn repo) sạch sau cả hai task.
- Gate tự động Task 1: `hasPermission(user.role, "edit-catalog")`, `isWebp`, `storage.backend`, `storage.remove` đều có; không còn `GDRIVE`/`APPS_SCRIPT` trong file (sau khi sửa deviation dưới).
- Gate tự động Task 2: `/api/anh/tai-len`, `/api/anh/xoa`, `/anh/00000000-0000-4000-8000-000000000000` đều có trong `test-route-permissions.ts`; `allSettled` có trong `xoa/route.ts`.
- Kiểm tĩnh ANH-05: `grep -rlnE "APPS_SCRIPT|DriveApp|GDRIVE" src/ | grep -v "features/images/lib/storage" | grep -v "src/lib/env-server.ts"` → rỗng.
- **KHÔNG chạy được `npx tsx scripts/test-route-permissions.ts` thật với dev server sống trong worktree này** — đúng giới hạn ghi trong `<parallel_execution>`: `npm run dev`/`npm run build` (Turbopack) văng lỗi symlink `node_modules` trỏ ra ngoài filesystem root của worktree (lặp lại hạn chế đã ghi ở 09-06-SUMMARY/09-07-SUMMARY). Dev server đang chạy trên cổng :3000 (nếu có) phục vụ code của `main`, không phải code của worktree này — không dùng để claim pass theo đúng chỉ dẫn. **09-13 (hoặc orchestrator sau khi merge lên `main`) phải tự chạy `npm run dev` + `npx tsx scripts/test-route-permissions.ts` để xác nhận 0 lệch**, đặc biệt kiểm cả ba nhánh mới: GET uuid giả, GET id thật (nếu đã có ảnh nạp qua 09-12), POST hai route ghi.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Thông điệp lỗi 502 (kind `forbidden`) va chạm gate tự động cấm chuỗi `APPS_SCRIPT`**
- **Found during:** Task 1, chạy `<verify><automated>` lần đầu (`! grep -qE "GDRIVE|APPS_SCRIPT"`).
- **Issue:** Theo `<action>` của plan, câu lỗi khi `ImageStorageError.kind === "forbidden"` phải nói "báo quản trị kiểm tra APPS_SCRIPT_SECRET" — chuỗi này khớp thẳng pattern gate tự động của chính task đó (cùng dạng bẫy đã gặp ở 09-06/09-07: comment/thông điệp giải thích vô tình chứa đúng chuỗi bị cấm).
- **Fix:** Đổi câu thành "Khóa bí mật gọi nơi lưu không khớp — báo quản trị kiểm tra cấu hình server." — vẫn đúng ý (báo quản trị kiểm tra bí mật gọi Apps Script) mà không nêu tên biến môi trường cụ thể, giữ đúng nguyên tắc D-10 (route không biết chi tiết Apps Script/Drive).
- **Files modified:** `src/app/api/anh/tai-len/route.ts`.
- **Commit:** sửa trước khi commit Task 1 (`1be8c33`), không tạo commit riêng.

**2. [Rule 1 - Bug] `layIdAnh` dùng client ẩn danh sẽ bị RLS chặn đọc `hinh_anh`**
- **Found during:** viết `kiemAnh()`, đối chiếu với pattern `layIdDon`/`layIdPhieuNhap` đã có trong file.
- **Issue:** Bản nháp đầu dùng `createServerClient` không đăng nhập (cookie rỗng) để `SELECT id FROM hinh_anh LIMIT 1` — RLS bảng `hinh_anh` (theo D-02) chỉ cho đọc khi đã đăng nhập, nên truy vấn sẽ luôn trả mảng rỗng và script vĩnh viễn báo "⚠ chưa có ảnh nào" dù đã có ảnh thật, che mất phần kiểm quan trọng nhất (GET ảnh thật thành công).
- **Fix:** Đăng nhập bằng phiên `quanly` (giống `layIdDon`/`layIdPhieuNhap`/... đã có trong file) trước khi `SELECT`, đúng khuôn các hàm `layId*` khác trong cùng file.
- **Files modified:** `scripts/test-route-permissions.ts`.
- **Commit:** phát hiện và sửa trong lúc viết Task 2, chưa từng commit bản sai, gộp vào `fe7b340`.

### Auth gates

Không có.

## Known Stubs

Không có — cả hai route và hàm `kiemAnh()` đều là code thật, gọi đúng các hàm server đã có từ 09-04/09-06 (`getImageStorage`, `insertImageRecord`, `softDeleteImage`, `fetchProductCode`). Chưa có component nào gọi `uploadProductImage`/`deleteProductImage` (thuộc 09-10/09-11) — đúng phạm vi plan này chỉ dựng route phía server, không phải thiếu sót.

## Ghi chú môi trường thực thi (không phải deviation code)

Lặp lại đúng hạn chế đã ghi ở 09-06/09-07-SUMMARY: `npm run dev`/`npm run build` không chạy được trong worktree do symlink `node_modules`. Đã dùng `npm run typecheck` + `npm run lint` thay thế theo đúng `<parallel_execution>`. **Việc còn thiếu quan trọng nhất trước khi coi wave 4 xong:** chạy `npm run dev` thật (trên checkout chính, không symlink) rồi `npx tsx scripts/test-route-permissions.ts` để xác nhận toàn bộ ma trận (bao gồm ba dòng mới của `kiemAnh()`) 0 lệch — chưa ai kiểm chứng điều này bằng HTTP thật.

## Self-Check: PASSED

- `src/app/api/anh/tai-len/route.ts` — FOUND
- `src/app/api/anh/xoa/route.ts` — FOUND
- Commit `1be8c33` (feat(anh): route tai anh len va xoa anh) — FOUND
- Commit `fe7b340` (test(anh): ma tran quyen cho ba route anh) — FOUND
