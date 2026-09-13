---
phase: 02-khung-ung-dung
plan: 02
subsystem: database
tags: [supabase, postgres, trigger, pgtap, audit-log, rls]

# Dependency graph
requires:
  - phase: 02-khung-ung-dung
    provides: "02-01: nguoi_dung_kho (bảng nối nhiều kho), vai_tro_hien_tai() đối chiếu bảng"
provides:
  - "Bảng nhat_ky_sua: nhật ký sửa append-only cho san_pham/doi_tac/nguoi_dung, bất biến hai lớp (REVOKE + trigger)"
  - "Trigger generic ghi_nhat_ky_sua: bắt mọi INSERT/UPDATE trên ba bảng, một dòng mỗi trường đổi, loại trừ cột vận hành tự động"
  - "Trigger ghi_nhat_ky_kho_nguoi_dung: gán/gỡ kho của người dùng cũng vào nhật ký (truong='kho')"
  - "RPC lich_su_sua(bang, ban_ghi_id, gioi_han): chỉ quan_ly/van_phong đọc, kèm ho_ten_nguoi_sua — đường DUY NHẤT client chạm nhật ký"
affects: [danh-muc, doi-tac, cai-dat-nguoi-dung, import-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nhật ký sửa generic bằng một hàm trigger dùng chung (tg_table_name, to_jsonb(old)/to_jsonb(new) trừ mảng cột loại trừ) thay vì viết trigger riêng từng bảng — thêm bảng mới vào D-20 chỉ cần một dòng CREATE TRIGGER"
    - "Nguồn ghi log (form/import/hang_loat/...) truyền qua set_config('app.nguon_sua', '<nguon>', true) trước câu lệnh ghi — RPC hàng loạt/import ở các plan sau PHẢI set biến này trước khi UPDATE/INSERT, không set thì mặc định 'form' (có JWT) hoặc 'script' (không JWT)"
    - "Bảng bất biến kiểu sổ cái luôn cần HAI lớp: REVOKE ALL (chặn service_role/authenticated/anon) + trigger chan_sua_xoa (chặn cả owner postgres) — dùng lại đúng mẫu kho_movement (0008)"
    - "pgTAP trong một file chạy chung MỘT transaction nên now() không đổi giữa các insert (transaction timestamp) — không dùng 'order by cot_thoi_gian desc limit 1' để phân biệt bản ghi mới nhất khi có nhiều dòng cùng transaction; kiểm bằng giá trị/nội dung cụ thể (exists ... and gia_tri_moi = ...) thay vì thứ tự thời gian"

key-files:
  created:
    - supabase/migrations/0027_nhat_ky_sua.sql
    - supabase/tests/70_nhat_ky_sua_test.sql
  modified: []

key-decisions:
  - "Giữ đúng thiết kế 'không policy nào, đọc qua RPC lich_su_sua' như plan — nghĩa là REVOKE ALL chặn cả việc TEST đọc trực tiếp bảng dưới role authenticated; mọi assertion pgTAP đọc trực tiếp nhat_ky_sua phải chạy dưới role postgres (chủ bảng, không bị REVOKE ràng buộc), chỉ giữ role authenticated đúng lúc cần ghi (để trigger bắt đúng người/nguồn) hoặc đúng lúc kiểm REVOKE tự nó (assertion 8)"

requirements-completed: [DMUC-04, DTAC-02]

# Metrics
duration: 25min
completed: 2026-09-13
---

# Phase 02 Plan 02: Nhật ký sửa append-only Summary

**Trigger generic `ghi_nhat_ky_sua` bắt mọi lần sửa `san_pham`/`doi_tac`/`nguoi_dung` (kể cả gán/gỡ kho) thành nhật ký bất biến hai lớp, đọc duy nhất qua RPC `lich_su_sua` kiểm vai trò, kiểm bằng 12 ca pgTAP trên dữ liệu thật.**

## Performance

- **Duration:** ~25 phút
- **Started:** 2026-09-13T15:00Z (tiếp theo sau plan 01)
- **Completed:** 2026-09-13T15:25Z
- **Tasks:** 1/1
- **Files modified:** 2 (2 tạo mới)

## Accomplishments

- Migration `0027`: bảng `nhat_ky_sua` (bất biến — REVOKE ALL + trigger `chan_sua_xoa_bat_bien` chặn cả `postgres`), trigger `ghi_nhat_ky_sua` sinh một dòng mỗi trường đổi (loại trừ `updated_at`/`created_at`/`lan_phat_sinh_cuoi`/`gia_von`) trên `san_pham`/`doi_tac`/`nguoi_dung`, trigger `ghi_nhat_ky_kho_nguoi_dung` bắt gán/gỡ kho, RPC `lich_su_sua` chỉ `quan_ly`/`van_phong` gọi được.
- 12 ca pgTAP mới xác nhận: tạo mới sinh đúng một dòng `_tao_moi`; sửa nhiều trường sinh nhiều dòng kèm giá trị cũ, người sửa, nguồn đúng (`form` mặc định, `import` khi set `app.nguon_sua`); update không đổi giá trị không sinh nhật ký thừa; nhật ký không sửa được bởi `authenticated` (42501) và không xóa được bởi cả `postgres` (23514); thủ kho không đọc được lịch sử (42501), quản lý đọc được kèm tên người sửa; ba cột vận hành tự động không bao giờ vào nhật ký.
- Xác nhận trên cloud: trigger `ghi_nhat_ky_nguoi_dung_kho` tồn tại (đếm = 1); toàn bộ `npm run db:test:linked` xanh **110/110** (98 cũ + 12 mới).

## Task Commits

1. **Task 1 (RED): Test 70 đỏ trước migration** — `ed8a7db` (test)
2. **Task 1 (GREEN): Migration 0027 + sửa 2 lỗi tự phát hiện trong test** — `13c8b2f` (feat)

_TDD: RED xác nhận đỏ đúng lý do (`relation "public.nhat_ky_sua" does not exist`) trước khi viết migration; GREEN vừa thêm migration vừa sửa lại chính bài test theo đúng thiết kế REVOKE của migration._

## Files Created/Modified

- `supabase/migrations/0027_nhat_ky_sua.sql` — Bảng `nhat_ky_sua`, hai trigger ghi nhật ký (generic cho ba bảng + riêng cho `nguoi_dung_kho`), trigger chặn sửa/xóa hai lớp, RPC `lich_su_sua`
- `supabase/tests/70_nhat_ky_sua_test.sql` — 12 assertion pgTAP, tiền tố mã `NKS-ZQX-`

## Decisions Made

Không có quyết định kiến trúc mới — migration bám sát đúng thiết kế đã chốt sẵn trong plan (bảng, hai trigger, RPC, danh sách cột loại trừ). Một quyết định kỹ thuật khi thực thi: giữ nguyên `REVOKE ALL` như plan yêu cầu (không nới lỏng để test dễ viết hơn) và tái cấu trúc chính bài test để tôn trọng đúng ranh giới quyền đó — xem "Deviations".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test tự viết đọc trực tiếp `nhat_ky_sua` trong khi vẫn ở role `authenticated` — vi phạm đúng REVOKE mà migration cố ý dựng**
- **Found during:** Task 1, GREEN — `npx supabase test db --linked` sau khi push migration, lỗi `permission denied for table nhat_ky_sua`.
- **Issue:** Bản nháp đầu của test 70 (bám sát trình tự nêu trong plan) đặt các assertion kiểm nội dung `nhat_ky_sua` ngay sau khi `dang_nhap_nhu('vanphong...')` mà không quay lại `postgres`. Vì migration cố ý `REVOKE ALL ... FROM anon, authenticated` (đúng thiết kế D-20 "đọc qua RPC, không đọc bảng trực tiếp"), mọi SELECT trực tiếp dưới role `authenticated` — kể cả trong chính bài test — đều bị chặn `42501`. Đây không phải lỗi của migration; migration đúng ý đồ. Lỗi nằm ở cách viết test.
- **Fix:** Tái cấu trúc trình tự: mọi UPDATE cần trigger bắt đúng người/nguồn vẫn chạy dưới `authenticated` (`dang_nhap_nhu`), nhưng mọi SELECT kiểm nội dung `nhat_ky_sua` chuyển sang chạy dưới `postgres` (`dang_xuat()` trước khi đọc) — `postgres` là chủ bảng, không bị `REVOKE` ràng buộc. Giữ nguyên đúng một chỗ chạy dưới `authenticated`: assertion 8 (`throws_ok` kiểm chính lớp REVOKE), vì đó là đối tượng cần chứng minh.
- **Files modified:** `supabase/tests/70_nhat_ky_sua_test.sql`
- **Verification:** `npx supabase test db --linked supabase/tests/70_nhat_ky_sua_test.sql` → từ "Bad plan, 0 tests ran" (RED thật) tiến tới các lỗi assertion cụ thể, rồi 12/12 ok.
- **Committed in:** `13c8b2f`

**2. [Rule 1 - Bug] Hai lỗi số liệu trong chính bài test (đếm sai tổng, sắp xếp theo cột thời gian không phân biệt được bản ghi cùng transaction)**
- **Found during:** Task 1, GREEN — chạy test lần hai sau khi sửa deviation 1, còn 2/12 fail.
- **Issue:** (a) Assertion "update không đổi giá trị không sinh nhật ký" kỳ vọng tổng `2` nhưng quên cộng dòng `_tao_moi` đã có sẵn từ bước 1 — tổng đúng phải là `3`. (b) Assertion "nguồn ghi theo `app.nguon_sua`" dùng `order by sua_luc desc limit 1` để lấy "dòng mới nhất", nhưng cả file chạy trong MỘT transaction pgTAP nên `now()` (nguồn của `sua_luc`) là hằng số suốt transaction — hai dòng cùng `truong='ghi_chu'` có `sua_luc` giống hệt nhau, `ORDER BY` không có cách phân biệt, trả về dòng bất kỳ trong hai dòng trùng thời điểm (ra `form` thay vì `import`).
- **Fix:** (a) Sửa số kỳ vọng từ `2` thành `3`. (b) Đổi cách kiểm sang `exists (... and nguon = 'import' and gia_tri_moi = to_jsonb('gc2'::text))` — kiểm đúng NỘI DUNG dòng vừa ghi thay vì suy luận "dòng mới nhất" qua timestamp không đáng tin trong ngữ cảnh một transaction.
- **Files modified:** `supabase/tests/70_nhat_ky_sua_test.sql`
- **Verification:** `npx supabase test db --linked supabase/tests/70_nhat_ky_sua_test.sql` → 12/12 ok; ghi lại thành pattern trong bài học pgTAP (frontmatter `tech-stack.patterns`)
- **Committed in:** `13c8b2f`

---

**Total deviations:** 2 auto-fixed (đều Rule 1 — lỗi trong CHÍNH bài test, migration không đổi so với thiết kế plan)
**Impact on plan:** Không đổi phạm vi, không đổi hành vi migration. Bài học về `now()` hằng số trong một pgTAP transaction đáng ghi vào `.memory/patterns/pgtap-va-test.md` cho các plan pgTAP sau có ORDER BY theo cột thời gian.

## Issues Encountered

Không có vấn đề chặn tiến độ — cả hai deviation đều phát hiện và sửa ngay trong lượt chạy `db:push` / `supabase test db --linked` đầu tiên của Task 1, không cần lượt thực thi thứ hai.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào. Migration đã áp bằng `npm run db:push` lên cloud `kho-vu-tru`.

## Next Phase Readiness

- RPC `lich_su_sua` và nguồn `set_config('app.nguon_sua', ...)` sẵn sàng cho:
  - Plan 07 (rà ghi chú) — set `'ra_ghi_chu'` trước khi ghi quyết định
  - Plan 08 (import/hàng loạt) — set `'import'` hoặc `'hang_loat'` trước RPC ghi hàng loạt
  - Màn chi tiết mã/đối tác (tab "Lịch sử sửa") — gọi thẳng `lich_su_sua('san_pham'|'doi_tac'|'nguoi_dung', id)`
- `database.types.ts` chưa có bảng `nhat_ky_sua`/hàm `lich_su_sua` — cần `npm run db:types` ở plan dùng tới (dự kiến plan 02-09, cùng lúc dọn `nguoi_dung_kho` còn treo từ plan 01).
- Không có blocker nào cho plan 02-03.

---
*Phase: 02-khung-ung-dung*
*Completed: 2026-09-13*

## Self-Check: PASSED

All created files and commit hashes verified present.
