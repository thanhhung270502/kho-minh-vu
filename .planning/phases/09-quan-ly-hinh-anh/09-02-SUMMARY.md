---
phase: 09-quan-ly-hinh-anh
plan: 02
subsystem: apps-script-storage
tags: [google-apps-script, google-drive, storage-adapter, images]
dependency_graph:
  requires: []
  provides:
    - "apps-script/Code.gs (doPost/doGet + put/get/remove contract)"
    - "apps-script/appsscript.json (manifest)"
    - "apps-script/README.md (hướng dẫn thiết lập tiếng Việt)"
  affects:
    - "09-04 (Route Handler gdrive-storage.server.ts sẽ gọi đúng hợp đồng JSON này)"
    - "09-13 (người dùng tự deploy Apps Script theo README này)"
tech_stack:
  added:
    - "Google Apps Script (V8 runtime) — không phải npm package, sống trong apps-script/"
  patterns:
    - "Một endpoint /exec, phân nhánh bằng trường action (put/get/remove)"
    - "Luôn trả HTTP 200, lỗi nằm trong body JSON { ok: false, error, message }"
    - "Folder id cache trong PropertiesService, tạo folder bọc LockService"
key_files:
  created:
    - apps-script/Code.gs
    - apps-script/appsscript.json
    - apps-script/README.md
  modified: []
decisions:
  - "Không gọi setSharing trên file Drive — giữ private, chỉ tài khoản Google riêng đọc được (D-05, T-09-07)"
  - "Xóa = setTrashed(true), không xóa hẳn (D-21) — remove_ idempotent, gọi lại không lỗi"
  - "getFolder_ bọc LockService.getScriptLock() để tránh tạo trùng folder khi hai request ghi ảnh cùng lúc lúc hệ thống mới khởi tạo"
metrics:
  duration: "~15 phút"
  completed: "2026-09-26"
---

# Phase 09 Plan 02: Apps Script storage adapter Summary

Viết mã nguồn Google Apps Script làm lớp trung gian ghi/đọc/xóa ảnh trên Google Drive
qua một endpoint `/exec` duy nhất, phân nhánh bằng `action`, cùng tài liệu thiết lập
tiếng Việt để người dùng tự deploy.

## Đã làm

**Task 1 — `apps-script/Code.gs` + `apps-script/appsscript.json`:**
- `doPost(e)`: parse JSON body trong try/catch, kiểm `secret` khớp
  `PropertiesService.getScriptProperties().getProperty('SECRET')`, phân nhánh
  `action` sang `put_`/`get_`/`remove_`, bọc toàn bộ trong try/catch trả lỗi
  `internal` không lộ stack trace.
- `doGet(e)`: luôn trả `bad_request` — mở URL `/exec` trên trình duyệt không lộ gì.
- `put_`: kiểm `folder` thuộc `ALLOWED_FOLDERS` (`san-pham/goc`, `san-pham/thumb`),
  `fileName` khớp `FILE_NAME_PATTERN` (`.webp`, ký tự an toàn), `mimeType` phải
  `image/webp`, `base64Data` không rỗng và ≤ `MAX_BASE64_LENGTH` (2.000.000 ký tự).
  Ghi file bằng `Utilities.newBlob` + `createFile`, không gọi bất kỳ API chia sẻ nào
  (file giữ private).
- `get_` / `remove_`: mở file bằng `DriveApp.getFileById` trong try/catch, không thấy
  hoặc đã trashed → `not_found`. `remove_` dùng `setTrashed(true)` (xóa mềm, idempotent).
- `getRootFolder_` / `getFolder_`: cache folder id trong `PropertiesService`, tạo folder
  còn thiếu bọc `LockService.getScriptLock()` (đọc lại property sau khi có lock, tránh
  hai request tạo trùng folder lúc hệ thống mới khởi tạo).
- `kiemTraThietLap()`: hàm chạy tay lần đầu trong trình soạn thảo để Google hỏi quyền
  Drive, in ra URL ba folder + trạng thái SECRET (không in giá trị SECRET) qua `Logger.log`.
- `appsscript.json`: `runtimeVersion: V8`, `oauthScopes` chỉ `drive`, webapp
  `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`.
- Không dùng `UrlFetchApp` (không gọi ra ngoài), không dùng thư viện ngoài, không
  hardcode secret.

**Task 2 — `apps-script/README.md`:** 12 mục tiếng Việt có dấu — vì sao có thư mục
này, tạo tài khoản Google riêng, bật Apps Script API, đẩy code bằng `clasp` (kèm
đường vòng thủ công nếu không cài được `clasp`), đặt `SECRET` qua Script Properties,
chạy `kiemTraThietLap` để cấp quyền Drive, deploy Web app (`Execute as: Me`,
`Who has access: Anyone` — giải thích vì sao vẫn an toàn), khai `APPS_SCRIPT_URL`/
`APPS_SCRIPT_SECRET` **chỉ server**, kiểm tra nhanh bằng `curl -L`, cập nhật code về
sau bằng "New version" (không phải "New deployment" — sẽ đổi URL), đổi SECRET khi
nghi lộ, và hợp đồng JSON đầy đủ (chép nguyên từ `<objective>` của `09-02-PLAN.md`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment trong `Code.gs` tự vi phạm gate tự động của chính nó**
- **Found during:** Task 1, chạy lệnh verify tự động lần đầu
- **Issue:** Comment giải thích "KHÔNG gọi setSharing" chứa đúng chuỗi `setSharing`
  mà lệnh verify `! grep -q "setSharing" apps-script/Code.gs` kiểm tra phải KHÔNG
  xuất hiện trong file — verify fail dù hành vi code đúng (không hề gọi API đó).
- **Fix:** Đổi câu chữ comment thành "Không mở quyền chia sẻ file" — giữ nguyên ý
  nghĩa, không còn chứa chuỗi bị cấm.
- **Files modified:** `apps-script/Code.gs`
- **Commit:** `68bd88c` (đã sửa trước khi commit, không có commit riêng cho fix này)

## Ghi chú vận hành khác

**Worktree này bị lệch base khi bắt đầu:** branch `worktree-agent-a0327a7ad83f79ea6`
đứng ở commit `93056b9`, thiếu 9 commit mới nhất của `main` — bao gồm toàn bộ nội dung
`.planning/phases/09-quan-ly-hinh-anh/` (context, research, 13 plan). Đã chạy
`git merge main --no-edit` (merge sạch, không xung đột) trước khi đọc plan, để có đủ
`09-02-PLAN.md`, `09-CONTEXT.md`, `09-RESEARCH.md` làm căn cứ thực thi. Không đụng tới
code hay migration nào — chỉ mang thêm tài liệu planning.

## Self-Check: PASSED

- `apps-script/Code.gs` — FOUND
- `apps-script/appsscript.json` — FOUND
- `apps-script/README.md` — FOUND
- Commit `68bd88c` (feat) — FOUND trong `git log --oneline`
- Commit `1f8a337` (docs) — FOUND trong `git log --oneline`
- Lệnh verify Task 1 (parse Code.gs bằng `new Function`, kiểm manifest, grep 5 điều
  kiện) — chạy lại lần cuối in `OK` + `ALL CHECKS PASSED`
- Lệnh verify Task 2 (grep 6 chuỗi bắt buộc trong README) — chạy lại lần cuối in `OK`
