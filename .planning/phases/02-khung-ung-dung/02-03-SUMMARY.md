---
phase: 02-khung-ung-dung
plan: 03
subsystem: database
tags: [supabase, postgres, trigger, pgtap, danh-so, cai-dat]

# Dependency graph
requires:
  - phase: 02-khung-ung-dung
    provides: "02-01/02-02: vai_tro_hien_tai(), update_updated_at(), quy ước REVOKE/GRANT + RLS đã dùng lại nguyên vẹn"
provides:
  - "Bảng cau_hinh_so_ct: tiền tố + số chữ số đánh số chứng từ theo từng loại, validate định dạng/trùng/khoảng, chặn giảm số chữ số dưới độ dài số đang chạy"
  - "sinh_so_ct đọc cấu hình từ bảng thay vì CASE hard-code, giữ nguyên chữ ký và hành vi reset theo năm"
  - "RPC danh_sach_cau_hinh_so_ct(): đọc cho mọi vai trò, kèm ví dụ số kế tiếp — nền cho màn Cài đặt (plan 15)"
affects: [cai-dat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trigger validate cấu hình đọc chéo bảng vận hành (chuoi_so_ct) để chặn thay đổi cấu hình có thể làm hỏng dữ liệu tương lai — validate không chỉ trong phạm vi CHECK constraint của chính bảng mà còn đối chiếu bảng khác"
    - "Không đặt khối DO tự-raise-exception-để-rollback (mẫu ở .memory/patterns/pgtap-va-test.md mục 6) vào TRONG file migration — migration chạy trong một transaction persist được, raise exception ở cuối sẽ rollback luôn cả CREATE TABLE. Mẫu đó chỉ dùng cho script kiểm tra chạy RIÊNG (psql thủ công), không nhúng vào migration"

key-files:
  created:
    - supabase/migrations/0028_cau_hinh_so_ct.sql
    - supabase/tests/80_cau_hinh_so_ct_test.sql
  modified: []

key-decisions:
  - "Bỏ mẫu DO $test$ ... raise exception '>>> TAT CA DUNG' (rollback có chủ đích) ra khỏi migration — thay bằng khối DO chỉ raise khi SAI (đọc thuần, không insert dữ liệu thử), vì migration cần COMMIT khi đúng, không phải luôn rollback như một file test độc lập"

requirements-completed: [CDAT-04]

# Metrics
duration: 15min
completed: 2026-09-13
---

# Phase 02 Plan 03: Cấu hình đánh số chứng từ Summary

**Bảng `cau_hinh_so_ct` cho quản lý sửa tiền tố + số chữ số đánh số theo từng loại chứng từ, với trigger chặn cứng việc giảm số chữ số xuống dưới độ dài số đang chạy năm nay — không bao giờ để `lpad` cắt cụt sinh ra số trùng.**

## Performance

- **Duration:** ~15 phút
- **Started:** 2026-09-13T15:13Z
- **Completed:** 2026-09-13T15:28Z
- **Tasks:** 1/1
- **Files modified:** 2 (2 tạo mới)

## Accomplishments

- Migration `0028`: bảng `cau_hinh_so_ct` (PK `loai_ct`, `check` định dạng tiền tố `^[A-Z0-9]{1,5}$`, `check so_chu_so` 3–8, `unique (tien_to)`), nạp sẵn 7 tiền tố cũ giữ nguyên số đã phát; trigger `kiem_so_chu_so_cau_hinh` đối chiếu độ dài `so_hien_tai` lớn nhất của năm hiện tại trong `chuoi_so_ct` trước khi cho giảm `so_chu_so`; viết lại `sinh_so_ct` đọc tiền tố/số chữ số từ bảng cấu hình (giữ chữ ký, giữ `set search_path = ''` đã có từ `0020`) kèm chặn cứng khi số vượt độ rộng cấu hình; RPC `danh_sach_cau_hinh_so_ct()` cho màn Cài đặt đọc mọi vai trò kèm ví dụ số kế tiếp; RLS chỉ `quan_ly` sửa được (`update` cột `tien_to, so_chu_so`), mọi vai trò `select`.
- 10 ca pgTAP mới (test 80) xác nhận: đủ 7 cấu hình mặc định giữ đúng định dạng Phase 1 (`PN26-000001` dạng, kiểm bằng năm 2091 → `PN91-000001`); đổi tiền tố + số chữ số áp cho số kế tiếp (`NK91-00002`); từ chối tiền tố thường (`23514`), tiền tố trùng (`23505` — unique violation tự nhiên), số chữ số > 8 (`23514`); chặn giảm số chữ số khi số năm nay đã dài hơn (`23514`, kiểm bằng dữ liệu chèn tạm trong transaction rollback, không đụng số thật); văn phòng sửa cấu hình bị RLS chặn im lặng (0 dòng, không lỗi); thủ kho đọc được RPC; ví dụ số kế tiếp đúng công thức.
- Test `20_chung_tu_test.sql` (đánh số + ghi sổ Phase 1) vẫn xanh 18/18 sau khi thay `sinh_so_ct`. Toàn bộ `npm run db:test:linked` xanh **120/120** (110 cũ + 10 mới).
- Xác nhận trên cloud: `select * from public.danh_sach_cau_hinh_so_ct()` trả đúng 7 dòng, cấu hình mặc định (`PN/PX/TN/TK/CK/KK/DC`, 6 chữ số, `so_hien_tai = 0` — số thật năm 2026 chưa bị đụng).

## Task Commits

1. **Task 1 (RED): Test 80 đỏ trước migration** — `d71a6dc` (test)
2. **Task 1 (GREEN): Migration 0028 + sửa khối tự kiểm để không rollback cả migration** — `2a667a5` (feat)

_TDD: RED xác nhận đỏ đúng lý do (`relation "public.cau_hinh_so_ct" does not exist`) trước khi viết migration; GREEN áp migration lên cloud bằng `db:push`, xanh 10/10, rồi xác nhận `20_chung_tu_test.sql` và toàn bộ suite không bị vỡ theo._

## Files Created/Modified

- `supabase/migrations/0028_cau_hinh_so_ct.sql` — Bảng `cau_hinh_so_ct`, trigger validate hai lớp (CHECK trong bảng + trigger đối chiếu `chuoi_so_ct`), `sinh_so_ct` viết lại đọc từ cấu hình, RPC `danh_sach_cau_hinh_so_ct`, RLS đọc/ghi phân vai trò
- `supabase/tests/80_cau_hinh_so_ct_test.sql` — 10 assertion pgTAP, dùng năm 2091 để cách ly khỏi số thật

## Decisions Made

Bám sát đúng thiết kế SQL cho sẵn trong plan (đã review kỹ trước khi copy). Một điều chỉnh kỹ thuật khi thực thi: plan ghi "Cuối file: khối DO tự kiểm RLS" và tham chiếu mẫu ở `.memory/patterns/pgtap-va-test.md` mục 6 (khối `DO` luôn `raise exception` ở cuối để buộc rollback dữ liệu thử). Mẫu đó đúng cho **script kiểm tra chạy riêng qua psql**, nhưng nhúng y nguyên vào **file migration** sẽ sai: migration của Supabase CLI áp trong một transaction persist được — nếu khối DO luôn raise ở cuối (kể cả khi mọi thứ đúng) thì cả migration (kể cả `CREATE TABLE`) sẽ bị rollback theo, migration coi như không áp được gì. Đã sửa: khối DO cuối migration chỉ đọc (đếm `cau_hinh_so_ct` = 7, đếm `danh_sach_cau_hinh_so_ct()` = 7), chỉ `raise exception` khi kết quả SAI (đúng ý migration: sai thì rớt, đúng thì commit), và không gọi `sinh_so_ct()` trong khối này để tránh để lại dòng `chuoi_so_ct` thử nghiệm vĩnh viễn trên dữ liệu thật.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Khối DO tự kiểm cuối migration copy nguyên mẫu "raise exception để rollback" sẽ làm rớt toàn bộ migration**
- **Found during:** Task 1, viết migration — tự rà lại trước khi push, nhận ra mẫu ở `.memory/patterns/pgtap-va-test.md` mục 6 (raise exception có chủ đích để rollback dữ liệu thử) chỉ đúng khi chạy như một câu lệnh `psql` độc lập ngoài transaction migration, không đúng khi nhúng vào file migration mà Supabase CLI áp trong transaction persist.
- **Issue:** Bản nháp đầu gọi `public.sinh_so_ct('NHAP', 2090::smallint)` rồi `raise exception '>>> TU KIEM: TAT CA DUNG'` để buộc rollback — nếu giữ nguyên, `db:push` sẽ rollback luôn `CREATE TABLE public.cau_hinh_so_ct` vừa tạo, migration coi như thất bại toàn bộ dù logic đúng.
- **Fix:** Viết lại khối DO cuối file: chỉ đọc (`count(*)` hai lần), chỉ `raise exception` khi số liệu sai; không gọi `sinh_so_ct()` để không sinh dòng `chuoi_so_ct` năm 2090 tồn tại vĩnh viễn trên dữ liệu thật.
- **Files modified:** `supabase/migrations/0028_cau_hinh_so_ct.sql`
- **Verification:** `npm run db:push` áp thành công (`"upToDate":false,...,"message":"Finished supabase db push."`), bảng và dữ liệu tồn tại sau khi áp.
- **Committed in:** `2a667a5`

---

**Total deviations:** 1 auto-fixed (Rule 1 — lỗi tự phát hiện trước khi push, không cần lượt sửa thứ hai trên cloud)
**Impact on plan:** Không đổi phạm vi hay hành vi nghiệp vụ đã đặc tả trong plan; chỉ sửa cách viết khối tự kiểm cho đúng ngữ cảnh migration persist (khác ngữ cảnh script kiểm tra độc lập mà `.memory` mô tả). Đã ghi lại thành pattern trong frontmatter để plan sau không lặp lại.

## Issues Encountered

Không có vấn đề chặn tiến độ. Deviation duy nhất phát hiện và sửa trước khi chạy `db:push` lần đầu — không cần lượt push thứ hai.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào. Migration đã áp bằng `npm run db:push` lên cloud `kho-vu-tru`.

## Next Phase Readiness

- `danh_sach_cau_hinh_so_ct()` và quyền `update (tien_to, so_chu_so)` sẵn sàng cho màn Cài đặt (plan 15, CDAT-04) — form đọc RPC, ghi trực tiếp `update public.cau_hinh_so_ct set ...` (RLS + trigger đã tự bảo vệ).
- `database.types.ts` chưa có bảng `cau_hinh_so_ct`/hàm `danh_sach_cau_hinh_so_ct` — cần `npm run db:types` ở plan dùng tới (dự kiến cùng lúc với plan 15 hoặc plan gom kiểu dữ liệu Cài đặt).
- Không có blocker nào cho plan 02-04.

---
*Phase: 02-khung-ung-dung*
*Completed: 2026-09-13*

## Self-Check: PASSED

All created files and commit hashes verified present.
