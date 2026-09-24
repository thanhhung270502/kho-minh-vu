---
phase: 06-kiem-ke-go-live
plan: 03
subsystem: database
tags: [postgres, rls, security-definer, pgtap, supabase, kiem-ke]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    plan: 01
    provides: "Không dùng trực tiếp trong 0065, nhưng cùng phạm vi công tắc quyền per-user; 0063 dry-run cùng lúc để giữ tính nhất quán"
  - phase: 04-don-dat-hang-phieu-xuat
    provides: "chung_tu/chung_tu_dong (0007), ghi_so_chung_tu/_ghi_so_kiem_ke (0011), policy RLS gốc (0016), helper cắt đệ quy (0042), sinh_so_ct (0047/0048)"
provides:
  - "mo_phien_kiem_ke(kho_id, nhom_hang_ids?, ghi_chu?) — một chung_tu KIEM_KE/kho (KKE-01)"
  - "luu_dong_kiem_ke(chung_tu_id, san_pham_id, so_luong) — chốt so_luong_he_thong TẠI LÚC LƯU từng dòng (D-03)"
  - "xoa_dong_kiem_ke(dong_id) — xóa một dòng đếm khi phiên còn NHAP_LIEU"
  - "nhap_so_dem_kiem_ke(chung_tu_id, du_lieu, chi_kiem_tra?) — nhập hàng loạt qua đúng luu_dong_kiem_ke, không nạp nửa vời (D-04/D-08)"
  - "la_chung_tu_kiem_ke(chung_tu_id), _pham_vi_kiem_ke(chung_tu_id) — helper nội bộ cho plan sau (chua_dem_kiem_ke, duyet_phien_kiem_ke)"
  - "uq_ct_dong_kiem_ke_ma — unique index một mã một dòng/phiên (D-05)"
affects: [06-04 (duyet_phien_kiem_ke sẽ dùng _pham_vi_kiem_ke), 06-x (UI mở phiên/đếm/import Excel), 06-05 (đẩy schema thật)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chốt số liệu THEO TỪNG DÒNG tại lúc ghi (không phải lúc mở phiên) bằng cách đọc bảng nguồn NGAY LÚC GỌI RPC rồi ghi kèm — dùng khi nghiệp vụ chạy song song với biến động khác (D-02: kho không đóng khi kiểm kê)."
    - "Khóa đường ghi trực tiếp PostgREST cho MỘT LOẠI dòng chứng từ (không phải cả bảng) bằng cách thêm điều kiện `not <helper_security_definer>(chung_tu_id)` vào policy insert/update/delete đã có — helper SECURITY DEFINER để không bị chính RLS chung_tu che khuất kết quả kiểm tra."
    - "Upsert theo khóa hỗn hợp (không phải PK) bằng ON CONFLICT trên unique index PARTIAL, khóa header bằng for update để tuần tự hóa — thay vì SELECT-rồi-quyết hai bước dễ race condition."

key-files:
  created:
    - supabase/tests/38_kiem_ke_dem_test.sql
    - supabase/migrations/0065_kiem_ke_dem.sql
  modified: []

key-decisions:
  - "_pham_vi_kiem_ke xét CẢ nhóm hàng lẫn 'có mặt ở kho' (dùng cho danh sách chưa đếm ở plan sau), nhưng luu_dong_kiem_ke/nhap_so_dem_kiem_ke CHỈ xét nhóm hàng khi kiểm tra một mã có được đếm hay không — cho phép đếm mã lạc kho (kho mặc định khác kho đầu phiên) mà không bị chặn nhầm, đúng 06-RESEARCH.md"
  - "Upsert luu_dong_kiem_ke dùng ON CONFLICT trên unique index partial (where so_luong_he_thong is not null) thay vì SELECT-rồi-quyết hai bước — khóa header bằng for update trước đó đã đủ tuần tự hóa, ON CONFLICT tránh được cửa sổ race giữa SELECT và INSERT"
  - "nhap_so_dem_kiem_ke gọi luu_dong_kiem_ke cho MỌI dòng sạch (kể cả dat, không chỉ cap_nhat) — đảm bảo ba đường nhập số đếm (điện thoại, máy tính, Excel) đi tuyệt đối chung một đường ghi, không có logic ghi riêng cho Excel"

requirements-completed: []  # KKE-01/02/DLIEU-06 CHƯA đánh dấu hoàn thành — plan này chỉ có lớp database, chưa có UI mở phiên/đếm/duyệt. Xem "Next Phase Readiness".

# Metrics
duration: 70min
completed: 2026-09-24
---

# Phase 6 Plan 3: Mở phiên & đếm kiểm kê (chốt tồn sổ theo dòng) Summary

**Bốn RPC SECURITY DEFINER (mở phiên, lưu một dòng đếm, xóa dòng, nhập hàng loạt) chốt `so_luong_he_thong` TẠI LÚC LƯU của TỪNG DÒNG — không phải lúc mở phiên — và khóa mọi đường ghi thẳng `chung_tu_dong` của KIEM_KE qua PostgREST; xác nhận GREEN bằng dry-run thật trên cloud, không đụng `_ghi_so_kiem_ke` đã đúng từ Phase 1.**

## Performance

- **Duration:** ~70 phút
- **Tasks:** 2/2 (TDD: RED → GREEN)
- **Files modified:** 2 (1 test mới, 1 migration mới)

## Accomplishments

- pgTAP `38_kiem_ke_dem_test.sql` — 41 assertion phủ C1-C15: mở phiên (phạm vi nhóm hàng tùy chọn, chặn theo vai trò/kho), D-03 cốt lõi (XUAT xen giữa lúc mở phiên và lúc lưu vẫn chốt đúng tồn tại LÚC LƯU, đếm lại chốt lại), mã chưa từng có `ton_kho` chốt 0 (không null), ràng buộc nghiệp vụ (ngoài phạm vi nhóm, số âm, null), khóa ghi trực tiếp PostgREST (insert/update/delete `chung_tu_dong`/`chung_tu` của KIEM_KE đều bị RLS chặn hoặc 42501), không phá luồng NHAP/XUAT cũ, xóa dòng + chặn xóa khi đã HOAN_THANH, nhập hàng loạt (xem trước/không nạp nửa vời/ghi thật), unique index, và `anon` không có quyền execute.
- Migration `0065_kiem_ke_dem.sql` — cột `pham_vi_nhom_hang`/`dem_luc`/`nguoi_dem_id`/`dem_lai`, unique index `uq_ct_dong_kiem_ke_ma`, helper `la_chung_tu_kiem_ke`/`_pham_vi_kiem_ke`, năm policy RLS sửa (thêm điều kiện chặn KIEM_KE), bốn RPC công khai (`mo_phien_kiem_ke`, `luu_dong_kiem_ke`, `xoa_dong_kiem_ke`, `nhap_so_dem_kiem_ke`), khối tự kiểm RLS cuối file.
- **Xác nhận RED thật trên cloud** trước khi viết migration: `function public.mo_phien_kiem_ke(...) does not exist`.
- **Xác nhận GREEN thật trên cloud** sau khi viết migration: `begin; <0065>; <thân test 38>; rollback;` qua kết nối trực tiếp tới project `phonzyruoalimgaovljm` (Session pooler) — `ket_qua = 'DAT'` (0/41 not ok). Xác nhận sau rollback bằng 4 truy vấn riêng: `mo_phien_kiem_ke` không tồn tại, mọi sản phẩm/nhóm hàng test (`KK-ZQX-*`, `ZQX-N*`) không còn trên cloud, migration mới nhất vẫn là `0062`.
- Truy vấn trước khi viết migration (đọc lúc dry-run): `select count(*) from chung_tu_dong where so_luong_he_thong is not null` = **0** — điều kiện bắt buộc để tạo unique index partial mới; và toàn văn `pg_policies` của `chung_tu`/`chung_tu_dong` (dán nguyên văn vào header migration).

## Task Commits

1. **Task 1: pgTAP 38 — RED** - `4377e14` (test)
2. **Task 2: Migration 0065 — GREEN** - `3f88c33` (feat, kèm sửa một chỗ trong test 38 phát hiện lúc dry-run)

_TDD: RED xác nhận thật trên cloud trước Task 2, GREEN xác nhận thật trên cloud sau khi viết migration — không có commit refactor riêng (fix phát hiện trong lúc GREEN được gộp vào cùng commit Task 2, xem Deviations)._

## Files Created/Modified

- `supabase/tests/38_kiem_ke_dem_test.sql` — 41 assertion pgTAP cho C1-C15
- `supabase/migrations/0065_kiem_ke_dem.sql` — 4 RPC, 2 helper, 4 cột mới, 1 unique index, 5 policy sửa

## Decisions Made

- **`_pham_vi_kiem_ke` tách biệt hoàn toàn khỏi kiểm tra scope trong `luu_dong_kiem_ke`/`nhap_so_dem_kiem_ke`** — hàm nội bộ này (dùng cho danh sách "chưa đếm" ở plan sau) xét CẢ nhóm hàng lẫn "có mặt ở kho" (mã ngừng kinh doanh còn tồn, mã chuyển kho); hai RPC ghi CHỈ xét nhóm hàng khi validate một mã cụ thể có đếm được hay không, cho phép đếm mã lạc kho đúng như 06-RESEARCH.md mô tả ("hàng tìm thấy trong kho dù kho mặc định khác vẫn đếm được").
- **Upsert bằng `ON CONFLICT` trên unique index partial**, không phải SELECT-rồi-quyết hai bước như `nap_ton_tam` — vì đây là RPC ĐẦU TIÊN trong dự án phải tự tìm-rồi-quyết insert/update theo khóa hỗn hợp mỗi lần gọi lặp lại (không phải insert-only hay update-theo-id-đã-biết như mọi RPC ghi khác); `for update` trên header đã tuần tự hóa đủ để `ON CONFLICT` an toàn.
- **`nhap_so_dem_kiem_ke` gọi `luu_dong_kiem_ke` cho MỌI dòng sạch** (`dat` lẫn `cap_nhat`), không tự insert/update trực tiếp — đảm bảo ba đường nhập số đếm (điện thoại, máy tính, Excel) tuyệt đối đi chung MỘT đường ghi, đúng D-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pgTAP đọc lại `auth.users` trong lúc assertion chạy dưới vai trò `vanphong`**
- **Found during:** Task 2, lần dry-run GREEN đầu tiên (`permission denied for table users`)
- **Vấn đề:** Assertion C4 ("`nguoi_dem_id` = người đang đếm") viết `(select id from auth.users where email = 'vanphong@khominhvu.local')` NGAY TRONG câu `select is(...)`, chạy dưới vai trò `authenticated` (do `dang_nhap_nhu` đã chuyển role trước đó). Supabase khóa bảng `auth.users` — chỉ `postgres`/`supabase_auth_admin` đọc được, `authenticated` thì không. Bisect từng statement trong transaction dry-run (chia file theo banner comment rồi theo dấu `;`) xác định đúng dòng gây lỗi.
- **Sửa:** Thêm cột `u_vanphong` vào `t_id` (đọc `auth.users` MỘT LẦN dưới `postgres`, trước mọi lần chuyển vai trò — đúng khuôn `dang_nhap_nhu` tự làm), assertion C4 so với `(select u_vanphong from t_id)` thay vì đọc lại `auth.users`.
- **Files modified:** `supabase/tests/38_kiem_ke_dem_test.sql`
- **Xác nhận:** dry-run lại — `ket_qua = 'DAT'`, 0/41 not ok.
- **Committed in:** `3f88c33` (gộp cùng commit Task 2, không tách commit refactor riêng vì đây là sửa lỗi trong TEST được phát hiện trong lúc xác nhận GREEN, không phải REFACTOR sau khi GREEN đã đạt bằng bản gốc)

---

**Total deviations:** 1 (auto-fixed test bug, phát hiện qua bisect dry-run thật trên cloud)
**Impact on plan:** Không ảnh hưởng phạm vi hay hợp đồng RPC. Việc bisect từng statement cho kết quả ĐÁNG TIN CẬY HƠN yêu cầu gốc — xác nhận chính xác dòng lỗi thay vì chỉ biết "có lỗi ở đâu đó trong 450 dòng".

## Issues Encountered

Không có blocker mới. `.env.local` vẫn còn vấn đề đã ghi ở `06-01-SUMMARY.md` (khối cấu hình sai đang active) — không chạm tới trong plan này, dùng lại đúng kết nối trực tiếp qua `pg` trong scratchpad như 06-01 đã làm.

## User Setup Required

None.

## Next Phase Readiness

- Bốn RPC (`mo_phien_kiem_ke`, `luu_dong_kiem_ke`, `xoa_dong_kiem_ke`, `nhap_so_dem_kiem_ke`) và hai helper (`la_chung_tu_kiem_ke`, `_pham_vi_kiem_ke`) sẵn sàng cho:
  - Plan `chua_dem_kiem_ke` (D-07, danh sách "chưa đếm") — gọi thẳng `_pham_vi_kiem_ke`.
  - Plan `duyet_phien_kiem_ke` (KKE-04) — phải tự thêm nhánh kiểm `duyet_duoc_kiem_ke()` vào `ghi_so_chung_tu` (0011) như 06-PATTERNS.md đã chỉ rõ vị trí chèn (SAU nhánh `chi_xem`, TRƯỚC vòng lặp) — **CHƯA làm ở plan này**, vẫn còn một user có quyền ghi sổ thường gọi thẳng được `ghi_so_chung_tu` cho phiên KIEM_KE nếu không có gate đó ở plan duyệt.
  - Plan UI mở phiên/đếm/import Excel — response shape của `nhap_so_dem_kiem_ke` giữ đúng hình `dat/cap_nhat/bo_qua/so_loi/chi_tiet_*/loi` như `nap_ton_tam` để tái dùng `cost-import.tsx`.
- **Migration `0065` CHƯA đẩy lên cloud** — `06-05` (plan duy nhất được phép đẩy schema của Phase 6) phải: (1) đẩy `0063` + `0065` + các migration khác của phase theo đúng thứ tự, (2) chạy `npm run db:types`, (3) chạy pgTAP 38 thật (không dry-run).
- **CHƯA đánh dấu KKE-01/02/DLIEU-06 hoàn thành** trong REQUIREMENTS.md — plan này chỉ có lớp database, chưa có màn hình nào dùng tới, theo đúng tiền lệ 05-01/05-02/06-01.
- **`unique index uq_ct_dong_kiem_ke_ma` giả định `so_luong_he_thong is not null` chỉ xuất hiện ở dòng KIEM_KE** — đúng với thiết kế hiện tại (cột `so_luong_he_thong` trên `chung_tu_dong` từ 0007 vốn đã "CHỈ dùng cho KIEM_KE"). Nếu sau này có loại chứng từ khác dùng cột này, phải xem lại index.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

- FOUND: supabase/tests/38_kiem_ke_dem_test.sql
- FOUND: supabase/migrations/0065_kiem_ke_dem.sql
- FOUND: .planning/phases/06-kiem-ke-go-live/06-03-SUMMARY.md
- FOUND commit: 4377e14
- FOUND commit: 3f88c33
