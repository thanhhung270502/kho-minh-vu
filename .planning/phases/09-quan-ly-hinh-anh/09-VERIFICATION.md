---
phase: 09-quan-ly-hinh-anh
verified: 2026-09-26T14:09:28Z
status: human_needed
score: 7/7 truths verified (all automatable checks pass); 3 items require human/device verification
human_verification:
  - test: "Bấm nút 'Chụp ảnh' trên điện thoại thật (Android/iPhone) tại chi tiết mã hàng, thử cả ảnh JPEG thường và ảnh HEIC chụp bằng camera iOS mặc định"
    expected: "Camera mở đúng (capture=environment), ảnh HEIC được iOS tự chuyển JPEG trước khi vào input (nhờ accept='image/jpeg,image/png,image/webp') hoặc — nếu trình duyệt gửi thẳng HEIC — hệ thống báo lỗi tiếng Việt dễ hiểu (ANH-01's 'HEIC không đọc được thì báo câu rõ ràng'), không phải lỗi kỹ thuật/màn trắng"
    why_human: "Cần thiết bị camera thật; môi trường Claude không truy cập được camera vật lý hay tệp HEIC gốc từ iPhone"
  - test: "Đăng nhập bằng tài khoản thủ kho và tài khoản chỉ xem, mở chi tiết một mã có ảnh và bảng /danh-muc"
    expected: "Thấy được ảnh/thumbnail (đọc luôn cho phép) nhưng KHÔNG thấy nút 'Chụp ảnh'/'Chọn ảnh', không thấy nút 'Đặt làm ảnh chính' hay 'Xóa' trên giao diện (server đã chặn 403 — cần xác nhận UI cũng ẩn đúng, không chỉ dựa vào chặn API)"
    why_human: "09-13-SUMMARY chỉ UAT bằng tài khoản quản lý; ma trận quyền đã chứng minh route trả 403 nhưng chưa xác nhận trực quan trên giao diện của hai vai trò còn lại"
  - test: "Trên bản triển khai Vercel Production thật (không phải localhost): khai APPS_SCRIPT_URL/APPS_SCRIPT_SECRET, redeploy, rồi lặp lại luồng chụp/tải/xem/xóa ảnh và kiểm tra cache lần xem thứ hai"
    expected: "Luồng ảnh hoạt động giống hệt localhost; Cache-Control private không bị Vercel Edge/CDN chia sẻ giữa người dùng; Server-Timing lần 2 nhỏ hẳn"
    why_human: "09-13-SUMMARY ghi rõ 'Bản production trên Vercel: người dùng tự làm, chưa kiểm từ phía Claude'; cần tài khoản Vercel thật để redeploy và kiểm"
---

# Phase 9: Quản lý hình ảnh Verification Report

**Phase Goal:** Quản lý và văn phòng chụp/tải ảnh mã hàng, mọi vai trò xem lại ngay trong app để nhận ra mặt hàng, không tốn tiền cloud — ảnh nằm trên Google Drive, nhưng database và giao diện không phụ thuộc Drive để sau này chuyển sang cloud chỉ bằng một script copy.
**Verified:** 2026-09-26T14:09:28Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Quản lý/văn phòng thêm ảnh (camera/file), nhiều ảnh/mã, không giới hạn (ANH-01) | ✓ VERIFIED | `image-upload-button.tsx` (camera + multi-file, hàng đợi), `rpc them_anh` không giới hạn số dòng trong `0068_hinh_anh.sql`; route `/api/anh/tai-len` kiểm quyền + kiểm lại WebP/kích thước phía server (không tin client) |
| 2 | Đặt ảnh chính, xóa mềm, ảnh kế tiếp lên thay (ANH-02) | ✓ VERIFIED | `dat_anh_chinh`/`xoa_anh` RPC trong migration; unique index `idx_hinh_anh_chinh_unique`; UAT 09-13 xác nhận trên hệ thật: xóa ảnh chính → ảnh cũ lên thay, `xoa_luc` có giá trị, `/anh/<id đã xóa>` → 404 |
| 3 | Mọi vai trò đã đăng nhập xem thư viện ảnh + phóng to tại chỗ; đọc chỉ qua `/anh/<id>`, chặn RLS + đăng nhập (ANH-03) | ✓ VERIFIED | `src/app/anh/[id]/route.ts` đòi `getUser()`, trả 401 JSON khi chưa đăng nhập; `proxy.ts` chặn `/anh/` sớm; `ProductImageGallery` dùng `Image.PreviewGroup`; UAT xác nhận phóng to hoạt động |
| 4 | Bảng danh mục có cột thumbnail (ô xám khi chưa có ảnh) + lọc Có/Chưa có ảnh (ANH-04) | ✓ VERIFIED | `thumbnail-column.tsx`, `product-thumbnail-cell.tsx`, `filter.schema.ts` (`?anh=co|chua` → `p_co_anh`); UAT: `/danh-muc?anh=co` → đúng 40/40 mã |
| 5 | Ảnh trên Google Drive qua Apps Script; DB chỉ lưu `noi_luu` + khóa; đổi nơi lưu không sửa giao diện (ANH-05) | ✓ VERIFIED | Bảng `hinh_anh` không có cột URL (chỉ `khoa_luu`/`khoa_luu_thumb`, `nguon_url` chỉ dùng để idempotent — có comment giải thích rõ không phải đường đọc); toàn bộ logic Drive gói trong `src/features/images/lib/storage/`; UAT: gọi Apps Script sai secret bị từ chối trên hệ thật |
| 6 | Chép một lần ~1.094 mã có ảnh từ KiotViet sang nơi lưu mới, script chạy lại được, có báo cáo lỗi (ANH-06) | ⚠️ PARTIAL (script verified, full copy deferred by user) | `scripts/copy-kiotviet-images/` hoạt động đúng thiết kế trên hệ thật: dry-run đúng số (1.094 mã/1.112 ảnh), `--ghi --gioi-han 20` chạy 2 lần không chép trùng, DB xác nhận 40 ảnh/40 mã/40 ảnh chính. Script đã chứng minh đúng — còn 1.072/1.112 ảnh CHƯA chép, người dùng chủ động hoãn chạy `--ghi` đầy đủ sau |
| 7 | Ma trận quyền route 3 route ảnh đúng cho 4 vai trò + khách | ✓ VERIFIED | `scripts/test-route-permissions.ts` có `kiemAnh()` cho GET `/anh/[id]`, POST tai-len, POST xoa; 09-13-SUMMARY ghi kết quả chạy trên hệ thật: 175/175 ô đúng |

**Score:** 7/7 truths hold at code level; 1 (ANH-06) intentionally partial by user decision, not a code gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/migrations/0068_hinh_anh.sql` | Bảng hinh_anh, RLS, RPC | ✓ VERIFIED | 443 dòng, table + unique index + 5 RPC + `p_co_anh` overload confirmed by grep |
| `supabase/tests/43_hinh_anh_test.sql` | pgTAP | ✓ VERIFIED | 316 dòng, exists |
| `apps-script/Code.gs` + `appsscript.json` + `README.md` | Apps Script storage adapter | ✓ VERIFIED | All present; README has setup steps; Code.gs has doPost |
| `src/features/images/lib/{image-rules,image-url,compress-image}.ts` | Pure functions + compression | ✓ VERIFIED | present, `test-pure-functions.ts` passes |
| `src/features/images/lib/storage/{image-storage,gdrive-storage.server,index.server}.ts` | Storage abstraction | ✓ VERIFIED | present; `test-image-storage.ts` passes (13 cases) |
| `src/app/anh/[id]/route.ts` + `src/features/images/api/image.server.ts` | Image read route | ✓ VERIFIED | present, cache headers match D-23, 401/404 handled |
| `src/features/images/api/image.api.ts` + `hooks/useProductImages.ts` | Client data layer | ✓ VERIFIED | present, invalidates `productKeys.lists` |
| `src/features/products/schemas/filter.schema.ts` + `product-filter-panel.tsx` | Image filter | ✓ VERIFIED | present, `p_co_anh` wired |
| `src/app/api/anh/tai-len/route.ts` + `src/app/api/anh/xoa/route.ts` | Write routes | ✓ VERIFIED | present, permission-checked, orphan-file compensation logic present per SUMMARY |
| `src/features/images/components/{image-upload-button,image-tile,product-image-gallery}.tsx` | Gallery UI | ✓ VERIFIED | present, wired into `product-detail.tsx` |
| `src/features/images/components/product-thumbnail-cell.tsx` + `thumbnail-column.tsx` | Catalog thumbnail | ✓ VERIFIED | present, wired into `product-columns.tsx` |
| `scripts/copy-kiotviet-images/{index.ts,parse-image-cell.ts}` + `package.json` sharp devDep | KiotViet copy script | ✓ VERIFIED | present; `sharp@0.35.4` devDependency confirmed in SUMMARY; live dry-run + partial `--ghi` run evidenced in 09-13 |

All 27 plan-declared artifacts exist on disk (verified via direct file checks); none are missing or stub (no TODO/FIXME/placeholder patterns found via grep across `src/features/images/`, `src/app/anh/`, `src/app/api/anh/`, `apps-script/`, `scripts/copy-kiotviet-images/`, and the migration).

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `danh_sach_san_pham` | `hinh_anh` | `p_co_anh` CTE filter | ✓ WIRED | Confirmed in migration + `filter.schema.ts` → RPC arg → UAT filter returned exact 40/40 |
| `them_anh`/`nap_anh_kiotviet` | `_chen_anh` | advisory lock, single internal function | ✓ WIRED | Present in migration per SUMMARY 09-01 |
| Apps Script `doPost` | `gdrive-storage.server.ts` | JSON `{secret, action}` contract | ✓ WIRED | UAT confirmed on live Apps Script: bad secret → `forbidden`, no secret GET → `bad_request` |
| `/anh/[id]/route.ts` | `rpc lay_khoa_anh` via `fetchImageKeys` | server client (RLS applies) | ✓ WIRED | Code present; live cache test shows correct Data Cache hit/miss timing (2678ms → 1ms) |
| `proxy.ts` | `/anh/` | 401 JSON before redirect | ✓ WIRED | Confirmed in `src/proxy.ts` line 28 |
| `image-upload-button.tsx` | `compress-image.ts` → `/api/anh/tai-len` | compress then multipart POST | ✓ WIRED | UAT: uploaded PNG 1600×1000 → compressed WebP 6.6KB, appeared ~10s later |
| `product-thumbnail-cell.tsx` | `useProductImages(productId, {enabled: open})` | lazy load only on preview open | ✓ WIRED | Present per SUMMARY 09-11, matches D-16/lazy-load must-have |
| `copy-kiotviet-images/index.ts` | `nap_anh_kiotviet` (service_role) + `GDriveImageStorage` | admin client + storage class | ✓ WIRED | Live run confirmed: 20+20 images copied across two `--ghi --gioi-han 20` runs without duplication |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `product-thumbnail-cell.tsx` | `primaryImageId` per row | `fetchProducts` → `fetchPrimaryImageIds` (real DB query, single batched call) | Yes — UAT showed 40/40 real thumbnails, 0 broken | ✓ FLOWING |
| `product-image-gallery.tsx` | image list for a product | `useProductImages` → `fetchProductImages` (real `hinh_anh` SELECT) | Yes — UAT showed real KiotViet-copied image tagged "Ảnh chính" | ✓ FLOWING |
| `/anh/[id]/route.ts` response body | image bytes | `getImageStorage().get()` → live Apps Script → live Drive file | Yes — UAT measured real Server-Timing (2678ms cold, 1ms cached) | ✓ FLOWING |

No hollow/disconnected data paths found — all traced to live-system evidence in 09-13-SUMMARY, not just code inspection.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full build + typecheck + lint | `npm run check` | Clean build, `/anh/[id]`, `/api/anh/tai-len`, `/api/anh/xoa` all present in route manifest | ✓ PASS |
| Pure function suite (incl. image rules, filter, parse-image-cell) | `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` | ✓ PASS |
| Storage adapter unit tests | `npx tsx scripts/test-image-storage.ts` | `✓ test-image-storage: 13 case` | ✓ PASS |
| Route permission matrix (175/175, live) | documented in 09-13-SUMMARY (not re-run here — requires dev server + live secrets/cookies) | 175/175 per SUMMARY | ? SKIP (not independently re-executed; would require starting dev server + live Apps Script secrets, outside read-only scope) |
| Live Apps Script auth rejection | documented in 09-13-SUMMARY (curl/Node fetch against real deployed URL) | `forbidden` on bad secret, `bad_request` on GET | ? SKIP (requires live external URL/secret not available to this verification run) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| ANH-01 | 09-01,03,05,07,09,10 | Thêm ảnh bằng camera/file, không giới hạn số ảnh | ✓ SATISFIED | Code + live UAT upload flow |
| ANH-02 | 09-01,05,07,09,10 | Đặt ảnh chính, xóa mềm, kế tiếp thay | ✓ SATISFIED | Code + live UAT delete/promote flow |
| ANH-03 | 09-01,05,06,07,09,10,11 | Mọi vai trò xem, phóng to, đọc qua `/anh/<id>`, RLS+login | ✓ SATISFIED | Code + live UAT + 401/404 tests |
| ANH-04 | 09-01,05,08,11 | Cột thumbnail + bộ lọc Có/Chưa có ảnh | ✓ SATISFIED | Code + live UAT `?anh=co` returned 40/40 |
| ANH-05 | 09-01,02,04,05,06 | Lưu Drive qua Apps Script, DB chỉ lưu noi_luu+khóa | ✓ SATISFIED | Code (no URL column) + live secret-rejection test |
| ANH-06 | 09-01,05,12,13 | Chép một lần ảnh KiotViet, script chạy lại được, có báo cáo lỗi | ⚠️ PARTIAL — script correctness fully verified live; full corpus copy (1,072 of 1,112 remaining) explicitly deferred by user's own choice, not a code defect | Live dry-run/`--ghi --gioi-han 20` (×2) evidence in 09-13-SUMMARY |

No orphaned requirements found — REQUIREMENTS.md lists exactly ANH-01..06 for Phase 9, all six appear in at least one plan's `requirements:` frontmatter (cross-checked above).

Note: `.planning/REQUIREMENTS.md` status column still shows `Pending` for all six ANH-* rows — this is a documentation bookkeeping item, not a functional gap; the orchestrator/user should update it after this verification.

### Anti-Patterns Found

None. Grep for `TODO|FIXME|XXX|HACK|PLACEHOLDER|not implemented|coming soon` across all phase-9 touched files (`src/features/images/`, `src/app/anh/`, `src/app/api/anh/`, `apps-script/`, `scripts/copy-kiotviet-images/`, `supabase/migrations/0068_hinh_anh.sql`) returned zero matches.

### Human Verification Required

### 1. Camera thật trên điện thoại + ảnh HEIC

**Test:** Mở chi tiết mã hàng trên điện thoại thật (đăng nhập quản lý/văn phòng), bấm "Chụp ảnh", chụp một ảnh; riêng iPhone thử thêm chọn một ảnh HEIC gốc từ Thư viện ảnh qua "Chọn ảnh".
**Expected:** Camera mở đúng hướng sau (`capture=environment`); ảnh xuất hiện trong thư viện ảnh của mã sau khi nén/tải; nếu trình duyệt gửi HEIC thẳng (không tự chuyển JPEG), hệ thống phải báo lỗi tiếng Việt dễ hiểu nói rõ cách khắc phục (chụp lại bằng nút Chụp ảnh / xuất JPEG) — không phải lỗi kỹ thuật hay treo màn hình.
**Why human:** Không có thiết bị camera thật hay file HEIC gốc trong môi trường xác minh này; đây là mục Claude's Discretion trong 09-CONTEXT.md và 09-13-SUMMARY ghi rõ "còn thiếu thiết bị thật".

### 2. Giao diện với vai trò thủ kho / chỉ xem

**Test:** Đăng nhập bằng tài khoản `thukho1` và tài khoản `chixem`, mở `/danh-muc` và chi tiết một mã có ảnh.
**Expected:** Thumbnail/ảnh hiển thị bình thường (đọc mở cho mọi vai trò); nút "Chụp ảnh"/"Chọn ảnh"/"Đặt làm ảnh chính"/"Xóa" KHÔNG xuất hiện trên giao diện cho hai vai trò này.
**Why human:** 09-13-SUMMARY UAT chỉ thực hiện bằng tài khoản `quanly`; ma trận quyền route (175/175) chứng minh backend chặn đúng nhưng chưa xác nhận trực quan là UI ẩn đúng nút cho vai trò không có quyền sửa.

### 3. Môi trường Production thật trên Vercel

**Test:** Khai `APPS_SCRIPT_URL`/`APPS_SCRIPT_SECRET` trên Vercel (Production + Preview), redeploy, rồi lặp lại luồng chụp/tải/xem/đặt chính/xóa ảnh và kiểm cache lần xem thứ hai (Server-Timing/`from disk cache`).
**Expected:** Hành vi giống hệt localhost; ảnh không rò rỉ cho người chưa đăng nhập qua CDN Vercel (D-23 chỉ được kiểm trên localhost, chưa kiểm hành vi CDN thật của Vercel Edge).
**Why human:** 09-13-SUMMARY ghi rõ "Bản production trên Vercel: người dùng tự làm, chưa kiểm từ phía Claude" — cần quyền truy cập tài khoản Vercel thật.

### Gaps Summary

No code-level gaps found. All six requirement IDs (ANH-01..06) are implemented, wired end-to-end, and — unusually thoroughly for this project — verified against the *live* system (real deployed Apps Script, real Google Drive, real Supabase cloud database, real RLS/permission matrix) in 09-13-SUMMARY.md, not just static code inspection. `npm run check`, the pure-function suite, and the storage adapter suite all pass cleanly with zero anti-patterns detected.

The only incomplete item is ANH-06's full corpus copy: the script itself is proven correct and idempotent (dry-run counts match exactly, two `--ghi --gioi-han 20` runs copied 20 new images each with zero duplicates, 40/40 images and primary-image assignments confirmed in the live DB), but only 40 of 1,112 images have actually been copied — the remaining 1,072 were deliberately deferred by the user's own choice ("Người dùng chọn tự chạy phần chép toàn bộ sau"), not because of any defect. This is a data-population task remaining for the user to run (`npm run import:kiotviet-images -- --ghi`), not a phase-9 code gap — hence `status: human_needed` rather than `gaps_found`.

Three items require human/device verification that cannot be automated or performed from this environment: real phone camera + HEIC handling, UI visibility check for non-edit roles, and Vercel production behavior.

---

*Verified: 2026-09-26T14:09:28Z*
*Verifier: Claude (gsd-verifier)*
