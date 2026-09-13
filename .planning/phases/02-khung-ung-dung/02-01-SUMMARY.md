---
phase: 02-khung-ung-dung
plan: 01
subsystem: database
tags: [supabase, postgres, rls, pgtap, jwt, auth-hook, migration]

# Dependency graph
requires:
  - phase: 01-nen-du-lieu
    provides: nguoi_dung/kho/vai_tro_hien_tai()/kho_hien_tai() ban đầu (một người một kho), custom_access_token_hook, RLS bốn vai trò
provides:
  - "Bảng nguoi_dung_kho: một người dùng gắn nhiều kho, backfill từ nguoi_dung.kho_id"
  - "vai_tro_hien_tai()/kho_hien_tai() đối chiếu claim JWT với bảng — hạ quyền/gỡ kho/vô hiệu hóa có hiệu lực ngay câu lệnh kế tiếp"
  - "custom_access_token_hook bơm kho_id dạng mảng"
  - "RPC luu_ho_so_nguoi_dung (tạo/sửa tài khoản + gán kho, một transaction), da_doi_mat_khau, thu_hoi_phien_nguoi_dung (service_role, xóa auth.sessions)"
  - "Tài khoản mẫu thukho2@khominhvu.local (K1+K2) cho UAT D-05/D-06"
affects: [02-02, 02-03, cai-dat-nguoi-dung, xac-thuc]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS phạm vi nhiều kho: kho_id = any((select public.kho_hien_tai())::uuid[]) — BẮT BUỘC ép kiểu ::uuid[], nếu không Postgres phân giải any((select ...)) thành ANY(subquery) (so từng dòng) chứ không phải ANY(array), ném 42883 uuid = uuid[]"
    - "Test pgTAP tránh đọc auth.users trong lúc role đã là authenticated (permission denied trùng SQLSTATE 42501 với lỗi nghiệp vụ đang kiểm) — tra id cần dùng vào bảng tạm dưới role postgres từ đầu file, không tra sống trong câu lệnh chạy dưới role người dùng"

key-files:
  created:
    - supabase/migrations/0026_nguoi_dung_nhieu_kho.sql
  modified:
    - supabase/tests/30_rls_test.sql
    - supabase/tests/00_helper.sql.inc
    - supabase/tests/10_ton_kho_test.sql
    - supabase/tests/20_chung_tu_test.sql
    - supabase/tests/40_tim_kiem_test.sql
    - supabase/tests/50_doi_chieu_test.sql
    - supabase/tests/60_kho_mac_dinh_test.sql
    - scripts/_supabase-admin.ts
    - scripts/seed-users.ts
    - scripts/verify-hook.ts

key-decisions:
  - "Không thu hồi được access token đã phát (auth.admin.signOut nhận JWT, không nhận userId): helper RLS đối chiếu claim với bảng nguoi_dung/nguoi_dung_kho mỗi câu lệnh — hạ quyền/gỡ kho/vô hiệu hóa có hiệu lực NGAY; nâng quyền/thêm kho có hiệu lực sau khi token làm mới (tối đa jwt_expiry=3600s, hoặc ngay khi client gọi refreshSession())"
  - "Giữ cột nguoi_dung.kho_id, chỉ ngừng đọc — xóa cột là đổi schema trên dữ liệu thật, cần hỏi người dùng (CLAUDE.md 'Không tự ý làm'), chưa hỏi ở plan này"

requirements-completed: [CDAT-01]

# Metrics
duration: 30min
completed: 2026-09-13
---

# Phase 02 Plan 01: Nhiều kho + thu hồi quyền tức thời Summary

**Bảng nối `nguoi_dung_kho` cho D-06 (một người nhiều kho) và helper RLS đối chiếu claim-với-bảng cho D-05 (hạ quyền/gỡ kho/vô hiệu hóa có hiệu lực ngay câu lệnh kế tiếp), kiểm bằng 9 ca pgTAP mới + JWT thật của tài khoản `thukho2`.**

## Performance

- **Duration:** ~30 phút
- **Started:** 2026-09-13T14:37Z (tiếp theo lúc chốt plan)
- **Completed:** 2026-09-13T14:54Z
- **Tasks:** 3/3
- **Files modified:** 11 (1 tạo mới, 10 sửa)

## Accomplishments

- Migration `0026`: bảng `nguoi_dung_kho`, cột `phai_doi_mat_khau`/`ten_dang_nhap` (D-01/D-03), `vai_tro_hien_tai()`/`kho_hien_tai()` đối chiếu claim với bảng, hook bơm `kho_id` dạng mảng, RPC `luu_ho_so_nguoi_dung`/`da_doi_mat_khau`/`thu_hoi_phien_nguoi_dung`.
- 9 ca pgTAP mới xác nhận: thủ kho 2 kho thấy tồn cả hai kho; gỡ kho có hiệu lực ngay dù claim cũ còn kho đó; vô hiệu hóa mất vai trò và mất quyền đọc tồn ngay dù token còn hạn; claim lệch bảng bị bỏ qua; chỉ `service_role` gọi được thu hồi phiên; `luu_ho_so_nguoi_dung` chặn đúng theo vai trò và ràng buộc nghiệp vụ.
- Toàn bộ 6 file pgTAP (98 assertion) và `verify:hook` (5/5, gồm `thukho2@khominhvu.local` K1+K2) xanh trên dữ liệu thật.

## Task Commits

1. **Task 1 (RED): Test đỏ trước migration** — `3d19d81` (test)
2. **Task 1 (GREEN): Migration 0026** — `1f9de95` (feat)
3. **Task 2: Helper ở 6 file pgTAP còn lại** — `a09845d` (test)
4. **Task 3: Tài khoản mẫu thukho2 + verify:hook mảng kho** — `6eb6bc1` (feat)

_TDD: Task 1 tách RED (test đỏ đúng lý do `relation nguoi_dung_kho does not exist`) rồi GREEN (migration) theo đúng cấu trúc plan._

## Files Created/Modified

- `supabase/migrations/0026_nguoi_dung_nhieu_kho.sql` - Bảng nối, helper đối chiếu live, hook mảng, RPC hồ sơ, thu hồi phiên
- `supabase/tests/30_rls_test.sql` - Helper dựng claim mảng, 3 assertion `any(...)`, 9 assertion mới D-05/D-06
- `supabase/tests/00_helper.sql.inc` + `10/20/40/50/60_*_test.sql` - Đồng bộ helper `dang_nhap_nhu` dùng `nguoi_dung_kho`
- `scripts/_supabase-admin.ts` - `TAI_KHOAN_MAU` dùng `maKho: string[]`, thêm `thukho2`
- `scripts/seed-users.ts` - Đồng bộ `nguoi_dung_kho` bằng delete-rồi-insert, bỏ `kho_id` khỏi upsert `nguoi_dung`
- `scripts/verify-hook.ts` - `Claims.kho_id` nhận mảng, so tập mã kho sau khi sort

## Decisions Made

- Giữ nguyên quyết định kỹ thuật đã chốt sẵn trong plan (đối chiếu claim-với-bảng thay vì thu hồi token thật) — không có quyết định kiến trúc mới phát sinh trong lúc thực thi.
- Hai điểm kỹ thuật phải tự sửa để chạy được, xem "Deviations" bên dưới.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `kho_id = any((select public.kho_hien_tai()))` không compile — thiếu ép kiểu**
- **Found during:** Task 1, `npm run db:push` lần đầu
- **Issue:** Postgres phân giải `any((select ...))` thành dạng `ANY(subquery)` (so `kho_id` với TỪNG DÒNG subquery trả về, ở đây một dòng duy nhất có kiểu `uuid[]`) chứ không phải `ANY(array)` — ném `42883: operator does not exist: uuid = uuid[]`. Đã kiểm chứng bằng psql trực tiếp (`select uuid = any((select array[...]))` lỗi; thêm `::uuid[]` thì chạy đúng và `EXPLAIN` vẫn cho `InitPlan` — không mất tối ưu bọc `select`).
- **Fix:** Thêm `::uuid[]` ngay sau `(select public.kho_hien_tai())` ở cả 4 chỗ dùng (3 policy trong migration 0026 + comment hướng dẫn) và 3 chỗ trong `30_rls_test.sql`.
- **Files modified:** `supabase/migrations/0026_nguoi_dung_nhieu_kho.sql`, `supabase/tests/30_rls_test.sql`
- **Verification:** `npm run db:push` chạy sạch; `EXPLAIN` xác nhận `InitPlan 1` (đánh giá một lần mỗi câu lệnh)
- **Committed in:** `1f9de95`

**2. [Rule 1 - Bug] pgTAP đếm sai: `plan(25)` thiếu 1 so với số assertion plan mô tả**
- **Found during:** Task 1, chạy `npx supabase test db --linked` sau khi push migration thành công
- **Issue:** Plan liệt kê 8 bullet (a)-(h) nhưng bullet (c) tự mô tả **2** assertion (`is(...) và is(...)`) — tổng thực tế là 9 assertion mới, không phải 8. `plan(25)` (17 cũ + 8) làm pgTAP báo "Looks like you planned 25 tests but ran 26".
- **Fix:** Đổi `plan(25)` thành `plan(26)`. Tổng bộ 6 file pgTAP giờ là **98** assertion, không phải 97 như mục `<verification>` gốc của plan ghi.
- **Files modified:** `supabase/tests/30_rls_test.sql`
- **Verification:** `npm run db:test:linked` → `Files=6, Tests=98` toàn bộ `ok`
- **Committed in:** `1f9de95`

**3. [Rule 1 - Bug] False pass tiềm ẩn: `throws_ok('42501')` cho ca (g)/(h) đọc `auth.users` khi đã ở role `authenticated`**
- **Found during:** Task 1, sau khi sửa (2), test 26 ("thủ kho phải có ít nhất một kho") báo `caught: 42501: permission denied for table users / wanted: 23514`
- **Issue:** SQL động trong `throws_ok` gọi `(select id from auth.users where email='thukho1@khominhvu.local')` trong khi role phiên đã là `authenticated` (do `dang_nhap_nhu` đã chuyển role trước đó) — `authenticated` không có quyền đọc `auth.users`, nên PostgreSQL ném `permission denied` với SQLSTATE **42501**, TRÙNG mã lỗi với kiểm tra nghiệp vụ `42501` ("Chỉ quản lý được sửa tài khoản") mà ca (g) đang cố kiểm. Đây đúng loại lỗi "false pass" đã ghi ở `.memory/patterns/pgtap-va-test.md` mục 1 — ca (g) xanh vì lý do SAI, và lộ ra khi ca (h) kỳ vọng mã khác (`23514`) không trùng ngẫu nhiên.
- **Fix:** Thêm cột `thukho1` vào bảng tạm `t_id` (tra dưới quyền `postgres` lúc tạo bảng, đầu file), rồi dùng `format('...%L::uuid...', (select thukho1 from t_id))` để nhúng giá trị id dạng literal vào câu lệnh động thay vì tra sống `auth.users`.
- **Files modified:** `supabase/tests/30_rls_test.sql`
- **Verification:** `npx supabase test db --linked supabase/tests/30_rls_test.sql` → `26/26 ok`
- **Committed in:** `1f9de95`

---

**Total deviations:** 3 auto-fixed (đều Rule 1 — bug trong SQL/pgTAP của chính plan, không phải lệch nghiệp vụ)
**Impact on plan:** Không đổi phạm vi hay quyết định nghiệp vụ nào. Riêng deviation 2 làm tổng số pgTAP toàn dự án là 98 thay vì 97 — cần lưu ý cho các plan sau nếu có assertion đếm cứng theo con số này.

## Issues Encountered

Không có vấn đề nào ngoài ba deviation ở trên — cả ba đều được phát hiện và sửa ngay trong quá trình chạy `db:push`/`db:test:linked` của Task 1, không chặn tiến độ Task 2/3.

## User Setup Required

None - không cần cấu hình dịch vụ ngoài nào. Migration đã áp bằng `npm run db:push` lên cloud; không có bước Dashboard mới (hook `custom_access_token_hook` đã bật từ Phase 1, chữ ký hàm giữ nguyên).

## Next Phase Readiness

- Sẵn sàng cho các plan sau của Phase 2 dùng `nguoi_dung_kho`, `luu_ho_so_nguoi_dung`, `thu_hoi_phien_nguoi_dung` (màn Cài đặt người dùng, D-02/D-04/D-05).
- Còn treo: xóa cột `nguoi_dung.kho_id` cũ (D-06) — chỉ làm khi người dùng đồng ý lúc execute plan liên quan, hiện giữ nguyên có comment "KHÔNG CÒN ĐỌC".
- `database.types.ts` chưa có bảng `nguoi_dung_kho` — `scripts/seed-users.ts` đang ép kiểu `as never` tạm thời, cần dọn ở plan 02-09 (`npm run db:types`).
- Không có blocker nào cho plan 02-02.

---
*Phase: 02-khung-ung-dung*
*Completed: 2026-09-13*

## Self-Check: PASSED

All created files and commit hashes verified present.
