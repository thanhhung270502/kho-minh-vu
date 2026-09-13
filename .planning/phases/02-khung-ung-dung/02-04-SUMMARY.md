---
phase: 02-khung-ung-dung
plan: 04
subsystem: database
tags: [supabase, postgres, rls, column-privilege, pgtap, security-definer]

# Dependency graph
requires:
  - phase: 02-khung-ung-dung
    provides: "02-01/02-03: vai_tro_hien_tai(), quy ước REVOKE bảng + GRANT cột đã dùng cho gia_ban (0015)"
provides:
  - "san_pham/kho_movement: SELECT thu về mức cột — authenticated không còn đọc gia_von/gia_von_tai_thoi_diem bằng bất kỳ đường PostgREST/SQL trực tiếp nào"
  - "RPC gia_von_san_pham(uuid[]) (SECURITY DEFINER, tự kiểm quan_ly/van_phong) — đường DUY NHẤT đọc giá vốn, kể cả quản lý"
  - "co_quyen_xem_gia_von() — helper dùng lại được cho các RPC danh sách/chi tiết/thẻ kho ở plan 06/09"
  - "tim_san_pham(text,int) đổi returns setof san_pham → returns table (cột tường minh, không gia_von)"
affects: [02-06, 02-07, 02-09, danh-muc-hang-hoa, export-excel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quyền cột cho SELECT dùng đúng khuôn: bàn giao có thể ĐÃ có GRANT SELECT mức bảng từ trước (mặc định Supabase) — phải REVOKE SELECT mức bảng rồi GRANT lại cột, REVOKE riêng một cột SELECT sẽ KHÔNG có tác dụng gì nếu mức bảng còn nguyên (khác REVOKE UPDATE/INSERT ở 0015, nơi mức bảng đã bị revoke từ đầu)"
    - "select 1 from bang / count(*) from bang KHÔNG cần bất kỳ quyền cột nào — Postgres chỉ kiểm quyền cột khi câu lệnh THAM CHIẾU cột cụ thể. Đã verify bằng transaction rollback trên cloud trước khi viết migration, tránh sửa nhầm test không cần sửa."
    - "Đổi kiểu trả về của hàm (setof bang → table cột tường minh) bắt buộc DROP FUNCTION rồi CREATE lại — CREATE OR REPLACE FUNCTION từ chối đổi kiểu trả về"

key-files:
  created:
    - supabase/migrations/0029_an_gia_von.sql
    - supabase/tests/90_gia_von_test.sql
  modified: []

key-decisions:
  - "Chọn Phương án A (REVOKE cột + RPC SECURITY DEFINER) thay vì view CASE WHEN — nhất quán với cách 0015 đã làm cho gia_ban (đảo chiều READ thay vì WRITE), audit được ngay bằng \\d san_pham, lỗi 42501 rõ ràng hơn null mập mờ. Hệ quả chấp nhận: quản lý cũng phải đọc gia_von qua RPC, không đọc trực tiếp bảng."
  - "Không sửa 20_chung_tu_test.sql/40_tim_kiem_test.sql dù plan liệt kê là files_modified — kiểm tra kỹ role đang chạy ở từng dòng nghi ngờ trước khi sửa (xem Deviations) và xác nhận cả hai file xanh nguyên trạng, tránh sửa test không cần thiết."

requirements-completed: [DMUC-05]

# Metrics
duration: 25min
completed: 2026-09-13
---

# Phase 02 Plan 04: Ẩn giá vốn theo vai trò ở tầng database Summary

**REVOKE SELECT mức bảng trên `san_pham`/`kho_movement` khỏi `authenticated`/`anon`, cấp lại từng cột trừ `gia_von`/`gia_von_tai_thoi_diem`, và mở đường đọc duy nhất qua RPC `gia_von_san_pham` (SECURITY DEFINER, chỉ `quan_ly`/`van_phong`) — kiểm bằng 11 ca pgTAP mới, toàn bộ 131 assertion trên dữ liệu thật vẫn xanh.**

## Performance

- **Duration:** ~25 phút
- **Started:** 2026-09-13T15:35Z
- **Completed:** 2026-09-13T16:00Z
- **Tasks:** 1/1
- **Files modified:** 2 (2 tạo mới)

## Bước 0 — Kiểm kê trước khi viết (kết quả thật trên cloud)

- **Cột `san_pham`** (20 cột, thứ tự thật): `id, ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id, quy_doi, gia_von, gia_ban, ton_toi_thieu, ton_toi_da, hinh_anh_url, vi_tri_ke, dang_kinh_doanh, ghi_chu, lan_phat_sinh_cuoi, created_at, updated_at, kho_mac_dinh_id`.
- **Cột `kho_movement`** (10 cột): `id, ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id, la_but_toan_dao, created_at`.
- **Xác nhận đúng cảnh báo của research:** `information_schema.role_table_grants` cho thấy `authenticated` VÀ `anon` đều có SELECT **mức bảng** trên cả hai bảng (từ default privilege Supabase, chưa từng bị revoke) — đúng như research đã cảnh báo, khác với UPDATE/INSERT (đã bị revoke từ 0015).
- **Hàm/view đọc `san_pham.*`/`gia_von` hoặc `kho_movement.*`/`gia_von_tai_thoi_diem`:**
  - `tim_san_pham` (0022) — **SECURITY INVOKER**, `select sp.*` — DUY NHẤT hàm cần sửa trong migration này.
  - `_ghi_so_nhap/_ghi_so_xuat/_ghi_so_tra_khach/_ghi_so_tra_ncc/_ghi_so_chuyen_kho/_ghi_so_kiem_ke/_ghi_so_dieu_chinh/ghi_so_chung_tu` (0011), `huy_chung_tu` (0012), `nap_danh_muc_kiotviet`/`nap_danh_muc_day_full` (0024/0025), `ghi_nhat_ky_sua`/`ghi_nhat_ky_kho_nguoi_dung` (0027) — tất cả **SECURITY DEFINER**, chạy dưới quyền owner, không bị ảnh hưởng.
  - `v_doi_chieu_ton` (`security_invoker=on`, 0020) chỉ đọc `kho_id/san_pham_id/so_luong` của `kho_movement` — không đụng `gia_von_tai_thoi_diem`; bản thân `doi_chieu_ton()` gọi view này lại là SECURITY DEFINER nên "invoker" hiệu lực của view là owner hàm, không phụ thuộc quyền cột của `authenticated`.
- **Xác nhận bằng thực nghiệm (transaction rollback trên cloud, không để lại gì):** `select 1 from san_pham limit 1` và `select count(*) from san_pham` chạy được dù KHÔNG có bất kỳ quyền cột nào — Postgres chỉ kiểm quyền cột khi câu lệnh tham chiếu cột cụ thể. Điều này xác nhận các test pgTAP hiện có dùng `count(*)`/`select 1`/`select ma_hang` (không đụng `gia_von`) sẽ không bị vỡ.

## Accomplishments

- Migration `0029`: `revoke select on san_pham/kho_movement from anon, authenticated` rồi `grant select (<cột trừ giá vốn>)` cho từng bảng; hàm `co_quyen_xem_gia_von()` + RPC `gia_von_san_pham(uuid[])` (SECURITY DEFINER, ném `42501` nếu không phải `quan_ly`/`van_phong`); `tim_san_pham` đổi từ `returns setof san_pham` sang `returns table (12 cột tường minh, không có gia_von)` — where/order by giữ nguyên từng ký tự so với 0022; khối tự kiểm cuối file chặn push nếu quên grant cột mới cho cả hai bảng.
- 11 ca pgTAP mới (test 90) xác nhận: thủ kho/chỉ xem không SELECT trực tiếp được `gia_von`/`gia_von_tai_thoi_diem` (42501); **kể cả quản lý cũng không `select *` trực tiếp** trên `san_pham` (42501) — giá vốn chỉ qua RPC; thủ kho vẫn đọc mọi cột khác và vẫn đếm được movement kho mình; `quan_ly`/`van_phong` gọi `gia_von_san_pham` ra đúng giá trị thật (đối chiếu với giá trị tra dưới quyền `postgres`); thủ kho/chỉ xem gọi RPC đó bị từ chối; `tim_san_pham` vẫn chạy cho thủ kho và không còn có `prorettype = san_pham`.
- **RED xác nhận đúng lý do trước khi push:** chạy test 90 trên migration chưa áp → 4/11 assertion đỏ đúng lý do (`gia_von_san_pham` chưa tồn tại — `42883`; `select gia_von`/`select *` chưa bị chặn — "no exception"), không phải lỗi cú pháp test.
- Toàn bộ `npm run db:test:linked`: **131/131** (120 cũ + 11 mới), **không sửa bất kỳ file test nào khác** — xem "Deviations" bên dưới về lý do 20/40 không cần sửa dù plan dự đoán có thể cần.
- Xác nhận trên cloud: `has_column_privilege('authenticated','public.san_pham','gia_von','SELECT')` = **false**, `has_column_privilege('authenticated','public.kho_movement','gia_von_tai_thoi_diem','SELECT')` = **false**, `has_table_privilege('authenticated','public.san_pham','SELECT')` = **false** (mức bảng đã thu hồi hoàn toàn, chỉ còn quyền cột).
- `npm run import:kiotviet -- --mau` (dry-run, `service_role`) chạy không lỗi — không bị ảnh hưởng bởi REVOKE (service_role có BYPASSRLS và không chịu quyền cột theo cùng cách kiểm tra ở đây; bản thân RPC nạp danh mục là SECURITY DEFINER).

## Task Commits

1. **Task 1 (RED): Test 90 đỏ trước migration** — `cdeee81` (test)
2. **Task 1 (GREEN): Migration 0029** — `e0330f1` (feat)

_TDD: RED chạy trên cloud xác nhận đỏ đúng lý do (hàm RPC chưa tồn tại, REVOKE chưa áp — không phải lỗi cú pháp SQL của chính test) trước khi viết migration; GREEN áp bằng `npm run db:push`, xanh 11/11, rồi xác nhận toàn bộ 131 assertion và `has_column_privilege` trên cloud._

## Files Created/Modified

- `supabase/migrations/0029_an_gia_von.sql` — REVOKE SELECT mức bảng + GRANT lại theo cột (san_pham, kho_movement); RPC `gia_von_san_pham`/`co_quyen_xem_gia_von`; `tim_san_pham` đổi kiểu trả về; khối tự kiểm hai bảng
- `supabase/tests/90_gia_von_test.sql` — 11 assertion pgTAP, dữ liệu tiền tố `GV-ZQX-`, giá trị kỳ vọng RPC tra dưới quyền `postgres` trước khi so sánh (tránh hard-code công thức bình quân gia quyền lặp lại trong test)

## Decisions Made

Bám sát Phương án A đã chốt sẵn trong research/plan (REVOKE cột + RPC SECURITY DEFINER), không phát sinh quyết định kiến trúc mới. Một điều chỉnh phạm vi khi thực thi — xem Deviations.

## Deviations from Plan

### Không sửa 20_chung_tu_test.sql / 40_tim_kiem_test.sql (khác dự đoán ban đầu của plan)

Plan liệt kê `supabase/tests/40_tim_kiem_test.sql` trong `files_modified` và cảnh báo "Test nào đỏ vì đọc `select *`/`gia_von` dưới role `authenticated` → sửa assertion". Trước khi sửa, đã đọc kỹ TỪNG dòng nghi ngờ và xác định KHÔNG cần sửa gì:

- **`40_tim_kiem_test.sql`:** chỉ dùng `count(*)`, `ma_hang`, `select 1` trên kết quả `tim_san_pham(...)` — không có `select *` hay `gia_von`. Cột `ma_hang` vẫn nằm trong `returns table` mới. Chạy `db:test:linked` xác nhận xanh nguyên trạng, không sửa file.
- **`20_chung_tu_test.sql`:** dòng nghi ngờ nhất là `select count(distinct gia_von_tai_thoi_diem) from public.kho_movement ...` (đọc trực tiếp cột giá vốn). Đọc kỹ ngữ cảnh: file `reset role;` ngay sau lần `dang_nhap_nhu('vanphong...')` DUY NHẤT trong file (dòng 88) — nghĩa là toàn bộ phần còn lại của file (kể cả dòng nghi ngờ) chạy dưới role **`postgres`** (chủ sở hữu bảng), không phải `authenticated`. REVOKE mới không áp dụng cho chủ sở hữu bảng (đúng nguyên lý Postgres, giống bài học ở `10_ton_kho_test.sql`/`.memory/patterns/pgtap-va-test.md` mục 3). Xác nhận bằng `db:test:linked` — xanh nguyên trạng.

**Impact:** Không có, chỉ là xác minh kỹ hơn dự đoán ban đầu của plan trước khi sửa — tránh sửa test không cần thiết (đúng tinh thần "No Workarounds" — chỉ sửa root cause khi thật sự có lỗi).

---

**Total deviations:** 0 auto-fix cần thiết — plan thực thi đúng như thiết kế; chỉ có một điểm xác minh kỹ hơn dự đoán (không phải lỗi, không phải thiếu sót).
**Impact on plan:** Không đổi phạm vi hay hành vi nghiệp vụ nào.

## Cảnh báo bắt buộc cho MỌI plan giao diện sau (D-16, ghi lại đúng yêu cầu success_criteria)

- **`.from('san_pham').select('*')` và `.select()` TRỐNG sau insert/update (return=representation) lỗi 42501 cho MỌI vai trò**, kể cả `quan_ly`. Luôn liệt kê cột tường minh, KHÔNG có `gia_von`. Tương tự cho `kho_movement` — không có `gia_von_tai_thoi_diem`.
- Muốn đọc giá vốn thật: gọi RPC `public.gia_von_san_pham(p_ids uuid[])` — trả `42501` nếu người gọi không phải `quan_ly`/`van_phong`. Dùng `co_quyen_xem_gia_von()` nếu chỉ cần biết CÓ quyền hay không (ví dụ để quyết định có hiện cột giá vốn trong bảng/export hay không) mà chưa cần giá trị.
- `tim_san_pham(text, int)` giờ `returns table (id, ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id, quy_doi, gia_ban, dang_kinh_doanh, kho_mac_dinh_id, lan_phat_sinh_cuoi)` — KHÔNG còn `setof san_pham`. Code TypeScript gọi RPC này (nếu có ở plan sau) nhận đúng 12 field trên, không có `gia_von`, `ton_toi_thieu`, `ton_toi_da`, `hinh_anh_url`, `vi_tri_ke`, `ghi_chu`, `created_at`, `updated_at`.
- Cột MỚI thêm vào `san_pham`/`kho_movement` ở migration sau **phải tự `grant select (<cột>) on ... to authenticated`** — khối tự kiểm ở cuối `0029` sẽ chặn `db:push` ngay nếu quên (raise exception liệt kê tên cột thiếu).

## Issues Encountered

Không có vấn đề chặn tiến độ. RED xác nhận đỏ đúng lý do ngay lần chạy đầu; GREEN áp một lần, không cần lượt push thứ hai.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào. Migration đã áp bằng `npm run db:push` lên cloud `kho-vu-tru`.

## Next Phase Readiness

- `gia_von_san_pham`/`co_quyen_xem_gia_von` sẵn sàng cho RPC danh sách sản phẩm (plan 06, DMUC-01..03) và chi tiết + thẻ kho (plan 09, DMUC-05) — cả hai RPC đó phải tự liệt kê cột và điều kiện hóa `gia_von` bằng `case when (select public.co_quyen_xem_gia_von()) then sp.gia_von end`, không được `select *`.
- Export Excel (D-23, DMUC-07) đã có sẵn `co_quyen_xem_gia_von()` để quyết định có thêm cột giá vốn vào file xuất hay không.
- Không có blocker nào cho plan 02-05.

---
*Phase: 02-khung-ung-dung*
*Completed: 2026-09-13*

## Self-Check: PASSED

All created files and commit hashes verified present.
