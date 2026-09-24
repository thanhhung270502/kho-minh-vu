---
phase: 06-kiem-ke-go-live
plan: 02
subsystem: database
tags: [postgres, rls, security-definer, pgtap, supabase, kiotviet]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    plan: 01
    provides: "public.xem_duoc_lich_su_kiotviet() — SECURITY DEFINER, đọc thẳng nguoi_dung theo auth.uid()"
  - phase: 04-don-dat-hang-phieu-xuat
    provides: "chung_tu/doi_tac (dùng trong lich_su_giao_dich_doi_tac)"
  - phase: 05-ton-kho
    provides: "the_kho_san_pham (0059/0062, running-balance ton_luy_ke)"
provides:
  - "public.tra_cuu_lich_su_kiotviet(...) — RPC tra cứu 594 dòng nhập + 4.732 dòng hóa đơn KiotViet lưu trữ, lọc loại/tu_khoa/ma_hang/san_pham_id/so_phieu/khoảng ngày (giờ VN), dùng chung cho /lich-su-kiotviet và tab chi tiết mã hàng"
  - "Ba cửa đọc luu_tru_* (policy 0016, lich_su_giao_dich_doi_tac 0033, the_kho_san_pham 0062) đều gate bằng xem_duoc_lich_su_kiotviet() thay vì vai_tro cứng"
  - "the_kho_san_pham KHÔNG còn trộn dòng KiotViet (D-11) — chỉ còn dòng sổ cái hệ thống"
affects: [06-08 (màn /lich-su-kiotviet dùng RPC này), 06-05 (đẩy schema thật), tab chi tiết mã hàng (đổi nguồn dữ liệu lịch sử KiotViet từ the_kho_san_pham sang tra_cuu_lich_su_kiotviet)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ba cửa cùng nguồn dữ liệu nhạy cảm (bảng + 2 RPC SECURITY DEFINER) phải cùng gate một helper quyền — grep TOÀN BỘ codebase theo tên bảng/RPC liên quan trước khi coi một chỗ sửa là đủ, không chỉ tin danh sách trong nghiên cứu ban đầu (cửa thứ ba the_kho_san_pham không có trong 06-RESEARCH.md)"

key-files:
  created:
    - supabase/tests/37_lich_su_kiotviet_test.sql
    - supabase/migrations/0064_lich_su_kiotviet.sql
  modified:
    - supabase/tests/42_the_kho_test.sql
    - supabase/tests/33_the_kho_luy_ke_test.sql

key-decisions:
  - "D-11 đọc là: BỎ HẲN hai nhánh union KiotViet khỏi the_kho_san_pham thay vì chỉ ẩn theo công tắc — dòng cũ không có kho_movement thật nên không có tồn lũy kế đúng, trộn vào dễ hiểu nhầm là sổ cái. Lịch sử KiotViet từ nay CHỈ xem qua tra_cuu_lich_su_kiotviet (màn riêng, plan 06-08)."
  - "tra_cuu_lich_su_kiotviet không nhận don_gia/thanh_tien (D-17 — không dùng giá ở màn tra cứu lịch sử, chỉ NCC/khách/số lượng/ghi chú)"

patterns-established:
  - "Khoảng ngày lọc theo NGÀY GIỜ VIỆT NAM: (cot::timestamptz at time zone 'Asia/Ho_Chi_Minh')::date, không so thẳng timestamptz với date vì Postgres/Supabase chạy UTC"

requirements-completed: [DLIEU-07]

# Metrics
duration: 55min
completed: 2026-09-24
---

# Phase 6 Plan 2: Lịch sử KiotViet — RPC tra cứu + ba cửa quyền Summary

**RPC `tra_cuu_lich_su_kiotviet` mới (lọc loại/tu_khoa/mã hàng/khoảng ngày giờ Việt Nam) cộng sửa BA cửa đọc dữ liệu lưu trữ KiotViet (policy 0016, `lich_su_giao_dich_doi_tac` 0033, và `the_kho_san_pham` 0062 — cửa thứ ba phát hiện ngoài nghiên cứu ban đầu) để cùng gate theo công tắc quyền từng người; thẻ kho không còn trộn lịch sử KiotViet (D-11) — xác nhận GREEN bằng dry-run thật trên cloud, không để lại dấu vết.**

## Performance

- **Duration:** ~55 phút
- **Tasks:** 2/2 (TDD: RED → GREEN)
- **Files modified:** 4 (1 test mới, 2 test sửa, 1 migration mới)

## Accomplishments

- pgTAP `37_lich_su_kiotviet_test.sql` — 22 assertion phủ B1-B10: `p_loai` lọc đúng nguồn và từ chối giá trị khác NHAP/XUAT (23514); `p_so_phieu` mở lại nguyên phiếu (D-10); `p_ma_hang`/`p_san_pham_id` khớp tuyệt đối; tìm tự do không dấu khớp cả ghi_chu lẫn nhà cung cấp (D-12); khoảng ngày lọc theo giờ Việt Nam (dòng 23:30 VN trong ngày, dòng 00:30 VN hôm sau bị loại); `tong_so_dong`/`tong_nhap`/`tong_xuat` tính trên toàn tập khớp dù `p_kich_thuoc := 1`; ba cửa quyền (RPC/RLS/`lich_su_giao_dich_doi_tac`) đều khóa khi tắt công tắc và mở lại ngay trong cùng transaction khi bật; `chixem` bị chặn, `quan_ly` luôn qua dù tự tắt cột (D-15); `the_kho_san_pham` không còn dòng nguồn KIOTVIET nào (D-11).
- Sửa `42_the_kho_test.sql` (đổi 3/7 assertion) và `33_the_kho_luy_ke_test.sql` (đổi 1/9 assertion) sang kỳ vọng KHÔNG còn dòng KiotViet trong thẻ kho.
- Migration `0064_lich_su_kiotviet.sql` — RPC `tra_cuu_lich_su_kiotviet` mới, hai policy `luu_tru_*` đổi gate, `lich_su_giao_dich_doi_tac` đổi một dòng, `the_kho_san_pham` bỏ hẳn hai nhánh KiotViet, khối tự kiểm RLS cuối file.
- **Xác nhận RED thật trên cloud** trước khi viết migration: 37 lỗi `function public.tra_cuu_lich_su_kiotviet(...) does not exist`; 42 đỏ đúng 3/7 (các assertion vừa sửa); 33 đỏ đúng 1/9 (assertion 4 vừa sửa).
- **Xác nhận GREEN thật trên cloud** sau khi viết migration: `begin; <0063>; <0064>; <thân test>; rollback;` cho cả bốn file (36, 37, 42, 33) — tất cả trả `ket_qua = 'DAT'` ngay lần chạy đầu tiên (không cần fix vòng hai). Xác nhận sau rollback: `tra_cuu_lich_su_kiotviet` không còn tồn tại, `schema_migrations` không có bản ghi 0063/0064.
- Truy vấn A5 (định dạng `ngay` sai ở `luu_tru_*`) trước khi viết migration: **0 dòng sai định dạng ở cả hai bảng** — an toàn để ép `ngay::timestamptz`.
- Đọc `pg_get_functiondef` trên cloud xác nhận `lich_su_giao_dich_doi_tac` và `the_kho_san_pham` **khớp hoàn toàn** với `0033_ra_ghi_chu_lich_su.sql`/`0062_sua_the_kho_cot_mo_ho.sql` trong git — dùng bản git làm gốc để sửa, không lệch cloud.

## Task Commits

1. **Task 1: pgTAP 37 mới + đổi kỳ vọng KiotViet trong 42 và 33 (RED)** - `79abb91` (test)
2. **Task 2: Migration 0064 — RPC tra cứu, ba cửa quyền, bỏ KiotViet khỏi thẻ kho (GREEN)** - `081e649` (feat)

_TDD: RED xác nhận thật trên cloud trước Task 2, GREEN xác nhận thật trên cloud ngay sau khi viết migration (không cần vòng sửa thứ hai) — không có commit refactor riêng._

## Files Created/Modified

- `supabase/tests/37_lich_su_kiotviet_test.sql` - 22 assertion pgTAP cho `tra_cuu_lich_su_kiotviet` và ba cửa quyền
- `supabase/tests/42_the_kho_test.sql` - 3 assertion đổi sang kỳ vọng không còn dòng KiotViet
- `supabase/tests/33_the_kho_luy_ke_test.sql` - 1 assertion (D-11) đổi sang kỳ vọng không còn dòng KiotViet
- `supabase/migrations/0064_lich_su_kiotviet.sql` - RPC mới + ba cửa quyền sửa

## Decisions Made

- **D-11 đọc là loại bỏ hoàn toàn, không phải ẩn theo công tắc:** thẻ kho (`the_kho_san_pham`) bỏ hẳn hai nhánh union đọc `luu_tru_*` — không phải chỉ thêm điều kiện `xem_duoc_lich_su_kiotviet()` vào đó. Lý do ghi trong migration: dòng KiotViet cũ không có `kho_movement` thật nên không tính được tồn lũy kế đúng theo running-balance của D-03 (Phase 5); trộn vào dễ khiến người dùng hiểu nhầm đó là sổ cái. Lịch sử KiotViet từ nay CHỈ xem qua `tra_cuu_lich_su_kiotviet` (màn riêng `/lich-su-kiotviet`, plan 06-08 sẽ dựng UI).
- **Cửa thứ ba phát hiện ngoài nghiên cứu ban đầu:** 06-RESEARCH.md chỉ liệt kê hai cửa (policy 0016, `lich_su_giao_dich_doi_tac`). Grep kỹ theo tên hai bảng `luu_tru_*` trong toàn bộ `supabase/migrations/` (theo `<read_first>` của plan) lộ ra `the_kho_san_pham` (0062) cũng đọc thẳng hai bảng này với gate `v_xem_kv := v_vai_tro in ('quan_ly','van_phong')`. Ghi vào threat register là T-06-09, đã vá cùng lúc.
- **`tra_cuu_lich_su_kiotviet` không trả `don_gia`/`thanh_tien`** (D-17) — RPC này phục vụ tra cứu lịch sử giao dịch (số lượng, đối tác, ghi chú), không phải xem giá; giữ đúng nguyên tắc "giá vốn chỉ qua RPC riêng" đã lập từ Phase 2 (D-16).

## Deviations from Plan

None - plan thực thi đúng như đặc tả, không có sai lệch nào cần Rule 1-4.

## Issues Encountered

Không có blocker. `.env.local` vẫn còn vấn đề đã ghi ở `06-01-SUMMARY.md` (khối cấu hình sai đang active) — không chạm tới trong plan này, dùng lại đúng kết nối trực tiếp qua `pg` trong scratchpad như 06-01/06-03 đã làm.

## User Setup Required

None.

## Next Phase Readiness

- `tra_cuu_lich_su_kiotviet` sẵn sàng cho plan 06-08 (màn `/lich-su-kiotviet`) và cho tab chi tiết mã hàng (đổi nguồn hiển thị lịch sử KiotViet từ `the_kho_san_pham` — nay đã bỏ — sang gọi RPC mới với `p_san_pham_id`).
- **Migration `0064` CHƯA đẩy lên cloud** — `06-05` (plan duy nhất được phép đẩy schema của Phase 6) phải: (1) đẩy `0063` + `0064` + `0065` + các migration khác của phase theo đúng thứ tự, (2) chạy `npm run db:types`, (3) chạy pgTAP 36/37/42/33 thật (không dry-run).
- **DLIEU-07 đã đánh dấu hoàn thành** trong REQUIREMENTS.md (khác tiền lệ 05-01/05-02/06-01/06-03 — plan này CÓ RPC nghiệp vụ đầy đủ, không chỉ nền quyền/dữ liệu).
- **Bất kỳ màn hình nào (tab chi tiết mã hàng, plan sau) đang mong đợi `the_kho_san_pham` trả dòng KIOTVIET_NHAP/KIOTVIET_BAN sẽ không còn thấy chúng nữa** — phải chuyển sang gọi `tra_cuu_lich_su_kiotviet(p_san_pham_id := ...)` để hiển thị lịch sử KiotViet của một mã hàng cụ thể.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

- FOUND: supabase/tests/37_lich_su_kiotviet_test.sql
- FOUND: supabase/migrations/0064_lich_su_kiotviet.sql
- FOUND: .planning/phases/06-kiem-ke-go-live/06-02-SUMMARY.md
- FOUND commit: 79abb91
- FOUND commit: 081e649
