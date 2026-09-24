---
phase: 06-kiem-ke-go-live
plan: 04
subsystem: database
tags: [postgres, rls, security-definer, pgtap, supabase, kiem-ke]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    plan: 01
    provides: "public.duyet_duoc_kiem_ke() — SECURITY DEFINER, quan_ly luôn true (D-15)"
  - phase: 06-kiem-ke-go-live
    plan: 03
    provides: "chung_tu.pham_vi_nhom_hang; chung_tu_dong.dem_luc/nguoi_dem_id/dem_lai; uq_ct_dong_kiem_ke_ma; public._pham_vi_kiem_ke(); mo_phien_kiem_ke/luu_dong_kiem_ke"
provides:
  - "public.danh_sach_phien_kiem_ke(...) — danh sách phiên KIEM_KE kèm tiến độ (so_da_dem/so_trong_pham_vi/so_dem_lai), p_chung_tu_id lọc một phiên cho trang chi tiết"
  - "public.bang_dem_kiem_ke(p_chung_tu_id, p_nhom_hang_id?) — bảng lệch của MỘT phiên: mọi mã trong phạm vi kèm so_dem/ton_so/lech/ton_hien_tai/ton_kiotviet (D-09)"
  - "public.dat_dem_lai(p_dong_id, p_dem_lai) — người duyệt trả một dòng về đếm lại (D-16)"
  - "public.duyet_phien_kiem_ke(p_chung_tu_id, p_chap_nhan_khong_dem?) — duyệt phiên (KKE-04), gọi ghi_so_chung_tu qua cờ transaction-local"
  - "ghi_so_chung_tu: cửa chặn mới cho KIEM_KE — chỉ đi được qua duyet_phien_kiem_ke, gọi thẳng luôn 42501 khi có phiên (auth.uid() not null)"
  - "huy_chung_tu: KIEM_KE đã ghi sổ chỉ quan_ly hủy được; thủ kho không hủy được phiên KIEM_KE ngoài kho mình"
affects: [06-09/06-10 (UI xem lệch + duyệt phiên, dùng RPC này), 06-05 (đẩy schema thật)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cờ quyền transaction-local (set_config(..., true) + kiểm current_setting trong hàm bị gọi) để khóa một RPC ghi sổ dùng chung (ghi_so_chung_tu) chỉ cho MỘT loại chứng từ đi qua đúng MỘT wrapper — PostgREST không gọi được set_config nên không giả được cờ."
    - "(fn()).* với hàm VOLATILE trả composite bị Postgres GỌI LẠI một lần cho MỖI cột được chiếu — xác nhận bằng thực nghiệm (đếm tăng dần qua từng field). Luôn dùng `select * from fn(...)` cho RPC ghi (side-effecting), không dùng `(fn(...)).* `."

key-files:
  created:
    - supabase/tests/39_kiem_ke_duyet_test.sql
    - supabase/migrations/0066_kiem_ke_duyet.sql
  modified: []

key-decisions:
  - "ghi_so_chung_tu: cửa chặn KIEM_KE đặt SAU khối kiểm chi_xem, TRƯỚC vòng lặp ghi dòng — chỉ áp khi auth.uid() is not null (script/postgres nội bộ không bị chặn, vì mọi client PostgREST thật luôn có auth.uid() khi đã đăng nhập)"
  - "duyet_phien_kiem_ke kiểm quyền (42501) TRƯỚC kiểm header/trạng thái (23514) — cho phép test/khách phân biệt rõ 'không có quyền' với 'phiên không hợp lệ'"
  - "Thứ tự kiểm trong duyet_phien_kiem_ke: quyền → header/NHAP_LIEU → còn dòng chờ đếm lại (D-16) → còn mã chưa đếm chưa xử lý (D-07) — dem_lai chặn TRƯỚC chưa đếm vì người duyệt cần giải quyết đếm lại trước khi tính đến chấp nhận 0"
  - "huy_chung_tu: thêm KIEM_KE vào danh sách 'đã ghi sổ chỉ quan_ly hủy' VÀ thêm nhánh riêng chặn thủ kho hủy phiên KIEM_KE ngoài kho mình dù còn NHAP_LIEU (khác NHAP/XUAT/TRA_* vốn không giới hạn kho ở bước hủy nháp)"

patterns-established:
  - "RPC ghi sổ dùng chung nhiều loại chứng từ (ghi_so_chung_tu) siết thêm MỘT loại bằng cờ transaction-local thay vì tách RPC riêng — giữ nguyên interface cũ cho NHAP/XUAT/TRA_*, không phá luồng đang chạy (pgTAP 29 xác nhận)"

requirements-completed: []  # KKE-03/KKE-04/DLIEU-06 CHƯA đánh dấu hoàn thành — plan này chỉ có lớp database (RPC "Xem"/"Duyệt" chưa có màn hình nào gọi tới), theo đúng tiền lệ 06-01/06-03. Xem "Next Phase Readiness".

# Metrics
duration: 65min
completed: 2026-09-24
---

# Phase 6 Plan 4: Duyệt kiểm kê — bảng lệch, danh sách phiên, duyệt phiên Summary

**Bốn RPC mới (danh sách phiên có tiến độ, bảng lệch của một phiên, cờ "đếm lại", duyệt phiên) cộng cửa chặn transaction-local trong `ghi_so_chung_tu` để phiếu KIEM_KE chỉ ghi sổ được qua `duyet_phien_kiem_ke` — không ai gọi thẳng bỏ qua kiểm D-07/D-14 được nữa; xác nhận GREEN bằng dry-run thật trên cloud cho cả pgTAP mới (48/48) lẫn hai bộ cũ (38, 29) để chứng minh không phá luồng đang chạy.**

## Performance

- **Duration:** ~65 phút
- **Tasks:** 2/2 (TDD: RED → GREEN)
- **Files modified:** 2 (1 test mới, 1 migration mới)

## Accomplishments

- pgTAP `39_kiem_ke_duyet_test.sql` — 48 assertion phủ E1-E12: bảng lệch với dòng chưa đếm (dong_id null) và tồn KiotViet tạm (D-09); D-03 cốt lõi (chốt tồn sổ TẠI LÚC LƯU sống sót qua một XUAT xen giữa); lọc theo nhóm hàng và tiến độ phiên (`so_da_dem`/`so_trong_pham_vi`/`so_dem_lai`); thủ kho bị chặn xem/thấy phiên kho khác; cờ "đếm lại" (`dat_dem_lai`) chỉ người có quyền đặt được và tự reset khi đếm lại; duyệt chặn khi còn mã chưa đếm/còn dòng chờ đếm lại (D-07/D-16); `ghi_so_chung_tu` gọi thẳng luôn 42501 dù có hay không có quyền duyệt (T-06-22); duyệt thành công chốt `ngay_ct` theo giờ Việt Nam, chấp nhận 0 chốt tồn TẠI LÚC DUYỆT (D-06), sau duyệt mọi thao tác sửa đều 23514; `huy_chung_tu` siết KIEM_KE đã ghi sổ chỉ quản lý; chấp nhận 0 một mã không thuộc "chưa đếm" bị chặn; `ghi_so_chung_tu` cho NHAP thường và cho KIEM_KE dưới `postgres` (script, không phiên) đều không bị ảnh hưởng.
- Migration `0066_kiem_ke_duyet.sql` — 4 RPC mới, sửa `ghi_so_chung_tu` (thêm đúng một khối chặn) và `huy_chung_tu` (thêm KIEM_KE vào danh sách chỉ quản lý hủy + chặn thủ kho ngoài kho), khối tự kiểm RLS cuối file.
- **Xác nhận RED thật trên cloud** trước khi viết migration: `function public.bang_dem_kiem_ke(uuid) does not exist`.
- **Xác nhận GREEN thật trên cloud** sau khi viết migration: `begin; <0063>; <0065>; <0066>; <thân test>; rollback;` cho cả ba file — **39 (48/48), 38 (41/41), 29 đều `DAT`** — chứng minh cửa chặn mới không phá luồng NHAP/XUAT/TRA_* cũ lẫn luồng đếm kiểm kê của 06-03. Xác nhận sau rollback: `duyet_phien_kiem_ke` không còn tồn tại, `schema_migrations` không có bản ghi 0063/0065/0066.
- Đọc `pg_get_functiondef` trên cloud xác nhận `ghi_so_chung_tu` và `huy_chung_tu` **khớp hoàn toàn** (từng ký tự, kể cả comment) với `0051_chung_tu_rpc_mo_rong.sql` trong git — dùng bản git làm gốc để vá, không lệch cloud.

## Task Commits

1. **Task 1: pgTAP 39 — bảng lệch, chưa đếm, đếm lại, duyệt, chặn cửa phụ (RED)** - `2bccac8` (test)
2. **Task 2: Migration 0066 — đọc phiên/bảng đếm, đếm lại, duyệt, siết ghi sổ và hủy (GREEN)** - `a676a96` (feat, kèm 2 sửa phát hiện lúc dry-run — xem Deviations)

_TDD: RED xác nhận thật trên cloud trước Task 2, GREEN xác nhận thật trên cloud sau khi viết migration — không có commit refactor riêng (sửa phát hiện trong lúc GREEN được gộp vào cùng commit Task 2, đúng tiền lệ 06-03)._

## Files Created/Modified

- `supabase/tests/39_kiem_ke_duyet_test.sql` — 48 assertion pgTAP cho E1-E12
- `supabase/migrations/0066_kiem_ke_duyet.sql` — 4 RPC mới, 2 hàm sửa (`ghi_so_chung_tu`, `huy_chung_tu`)

## Decisions Made

- **Cờ transaction-local `kho_minh_vu.duyet_kiem_ke`** thay vì tách `ghi_so_chung_tu` riêng cho KIEM_KE — giữ nguyên interface cũ cho sáu loại chứng từ khác, chỉ `duyet_phien_kiem_ke` đặt được cờ này (PostgREST không gọi được `set_config` qua REST nên không giả được). Kiểm `duyet_duoc_kiem_ke()` lần hai trong `ghi_so_chung_tu` là phòng thủ nhiều lớp.
- **`auth.uid() is null` (script/postgres) không bị chặn** trong cửa mới của `ghi_so_chung_tu` — mọi client PostgREST thật luôn có `auth.uid()` khi đã đăng nhập; chặn cả trường hợp null sẽ phá các lời gọi nội bộ dưới `postgres` (migration, script vận hành).
- **`huy_chung_tu` thêm nhánh RIÊNG chặn thủ kho hủy phiên KIEM_KE ngoài kho mình** kể cả khi còn NHAP_LIEU — khác NHAP/XUAT/TRA_* (không giới hạn kho ở bước hủy nháp) vì D-02 cho phép kiểm kê chạy song song với biến động kho khác, hủy nhầm phiên kho khác vẫn là rủi ro cần chặn ngay cả trước khi ghi sổ.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `(fn(...)).* ` gọi lại hàm VOLATILE MỘT LẦN CHO MỖI CỘT — xác nhận bằng thực nghiệm**
- **Found during:** Task 2, lần dry-run GREEN đầu tiên (`Phiên đã duyệt hoặc đã hủy` — lỗi vô lý vì phiên vừa xác nhận còn NHAP_LIEU ngay trước đó)
- **Vấn đề:** pgTAP 39 dùng khuôn `select (public.mo_phien_kiem_ke(...)).*`/`select (public.duyet_phien_kiem_ke(...)).*` chép từ test 38. Bisect bằng `RAISE NOTICE` bên trong `duyet_phien_kiem_ke` cho thấy hàm bị gọi **4 lần** trong MỘT câu lệnh (một lần mỗi trường của `.*`) — lần đầu duyệt thành công (`NHAP_LIEU`), các lần sau thấy `HOAN_THANH` và tự raise `23514`, khiến cả câu lệnh thất bại. Xác nhận thêm bằng hàm đếm tối giản: `(pg_temp.tick()).*` với 2 trường trả về `n=1, m=4` (không nhất quán) và biến đếm nội bộ tăng lên 2 — chứng minh đây là hành vi CHUẨN của Postgres với hàm VOLATILE trả composite qua `(fn()).*`, không phải lỗi riêng của migration này.
- **Sửa:** Đổi mọi lời gọi RPC ghi sổ có side-effect trong `39_kiem_ke_duyet_test.sql` từ `(fn(...)).* ` sang `select * from fn(...)` (gọi hàm như "function trong FROM clause" — Postgres đảm bảo chỉ gọi đúng một lần). Không sửa `38_kiem_ke_dem_test.sql` (ngoài phạm vi Task 2 — các RPC nó gọi lặp lại vô hại: `mo_phien_kiem_ke` tạo thêm chứng từ orphan không ảnh hưởng assertion lọc theo id cụ thể, `luu_dong_kiem_ke` là upsert idempotent) — ghi vào `deferred-items.md`.
- **Files modified:** `supabase/tests/39_kiem_ke_duyet_test.sql`
- **Xác nhận:** dry-run lại — hết lỗi giả, chuyển sang lỗi thật (2 assertion sai số, xem mục 2 dưới).

**2. [Rule 1 - Bug] Số liệu kỳ vọng E8 sai vì E5 vô tình chốt lại `so_luong_he_thong` của A**
- **Found during:** Task 2, lần dry-run GREEN thứ hai (`not ok 33`, `not ok 36`)
- **Vấn đề:** E5 gọi lại `luu_dong_kiem_ke(P, A, 8)` để minh chứng "đếm lại reset cờ đếm lại" — đúng hành vi D-03, cuộc gọi này ĐỌC LẠI tồn NGAY LÚC ĐÓ (đã là 9 sau XUAT ở E2) và CHỐT LẠI `so_luong_he_thong` từ 10 xuống 9. Assertion E8 vẫn kỳ vọng chốt cũ (10), sai với hành vi thật của migration (đúng đặc tả D-03: chốt LẦN CUỐI lúc lưu, không phải lúc mở phiên).
- **Sửa:** Cập nhật kỳ vọng E8: `movement A = -1` (8 - 9, chốt lần cuối ở E5) thay vì -2; `ton_kho A = 8` (9 - 1) thay vì 7. D-03 vẫn được minh chứng đầy đủ — E2 tự nó đã xác nhận chốt sống sót qua một XUAT (assertion riêng), E8 xác nhận chốt LẦN CUỐI (từ E5) được dùng đúng lúc duyệt, không tính lại theo tồn lúc đó.
- **Files modified:** `supabase/tests/39_kiem_ke_duyet_test.sql`
- **Xác nhận:** dry-run lại — `ket_qua = 'DAT'`, 0/48 not ok.
- **Committed in:** `a676a96` (gộp cùng commit Task 2, đúng tiền lệ 06-03 — sửa lỗi TEST phát hiện lúc xác nhận GREEN, không phải REFACTOR sau khi GREEN đã đạt bằng bản gốc).

---

**Total deviations:** 2 (cả hai auto-fixed trong TEST, phát hiện qua dry-run thật trên cloud — không có deviation nào trong migration)
**Impact on plan:** Không ảnh hưởng phạm vi hay hợp đồng RPC. Phát hiện #1 là một bài học kỹ thuật Postgres quan trọng (ghi vào pattern mới), không phải lỗi thiết kế của 06-04.

## Issues Encountered

**Ngoài phạm vi (KHÔNG sửa, ghi vào `deferred-items.md`):** `38_kiem_ke_dem_test.sql` (06-03) dùng cùng khuôn `(fn()).* ` cho `mo_phien_kiem_ke`/`luu_dong_kiem_ke` — vô hại với các RPC ĐÓ (idempotent hoặc chỉ tạo orphan không ảnh hưởng assertion), nhưng là thói quen rủi ro nên tránh dùng tiếp cho RPC ghi mới. Không sửa 38 vì ngoài `files_modified` của plan này (SCOPE BOUNDARY).

`.env.local` vẫn còn vấn đề đã ghi ở `06-01-SUMMARY.md` (khối cấu hình sai đang active) — không chạm tới trong plan này, dùng lại đúng kết nối trực tiếp qua `pg` trong scratchpad như 06-01/06-02/06-03 đã làm.

## User Setup Required

None.

## Next Phase Readiness

- Bốn RPC (`danh_sach_phien_kiem_ke`, `bang_dem_kiem_ke`, `dat_dem_lai`, `duyet_phien_kiem_ke`) và hai hàm sửa (`ghi_so_chung_tu`, `huy_chung_tu`) sẵn sàng cho plan UI xem lệch + duyệt phiên (Wave sau của Phase 6).
- **Migration `0066` CHƯA đẩy lên cloud** — `06-05` (plan duy nhất được phép đẩy schema của Phase 6) phải: (1) đẩy `0063` + `0064` + `0065` + `0066` + các migration khác của phase theo đúng thứ tự, (2) chạy `npm run db:types`, (3) chạy pgTAP 36/37/38/39/42/33 thật (không dry-run).
- **CHƯA đánh dấu KKE-03/KKE-04/DLIEU-06 hoàn thành** trong REQUIREMENTS.md — plan này chỉ có lớp database; KKE-03 ("Xem bảng lệch") và KKE-04 ("Duyệt phiên kiểm kê") đều là hành động cần MÀN HÌNH, chưa có giao diện nào gọi tới RPC này, đúng tiền lệ 06-01/06-03. DLIEU-06 cũng phụ thuộc UI duyệt kiểm kê thật (chưa dựng).
- **Bất kỳ màn hình nào (bảng lệch, nút duyệt phiên) đều PHẢI gọi qua `duyet_phien_kiem_ke`**, không được gọi `ghi_so_chung_tu` trực tiếp cho phiếu KIEM_KE — sẽ luôn nhận 42501 theo thiết kế (T-06-22/T-06-23).
- **Pattern mới cần nhớ khi viết RPC ghi sổ tiếp theo:** không dùng `(fn(...)).* ` cho hàm VOLATILE trả composite — luôn `select * from fn(...)`. Đã ghi vào `tech-stack.patterns` ở trên; nên đưa vào `.memory/patterns/pgtap-va-test.md` ở lần cập nhật bộ nhớ kế tiếp.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

- FOUND: supabase/tests/39_kiem_ke_duyet_test.sql
- FOUND: supabase/migrations/0066_kiem_ke_duyet.sql
- FOUND: .planning/phases/06-kiem-ke-go-live/06-04-SUMMARY.md
- FOUND commit: 2bccac8
- FOUND commit: a676a96
