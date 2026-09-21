---
phase: 05-ton-kho-tong-quan
plan: 01
subsystem: database
tags: [postgres, plpgsql, rpc, pgtap, jsonb, rls]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat
    provides: kho_movement/ton_kho có dữ liệu thật (trigger 0008) để RPC đọc
provides:
  - "RPC public.danh_sach_ton_kho — đọc tồn theo mã x kho, pivot vào jsonb ton_theo_kho, phân trang/lọc/đếm ở server"
  - "pgTAP 32_danh_sach_ton_kho_test.sql — phủ pivot jsonb, phạm vi kho thủ kho, lọc duoi_dinh_muc, 42501"
affects: [05-ton-kho-tong-quan các plan sau dùng RPC này cho features/inventory]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pivot kho→cột bằng jsonb_object_agg trong CTE ton (không hard-code mã kho, không crosstab)"
    - "RPC SECURITY DEFINER tự áp phạm vi kho của thu_kho ngay trong CTE, không dựa vào RLS"

key-files:
  created:
    - supabase/migrations/0058_rpc_ton_kho.sql
    - supabase/tests/32_danh_sach_ton_kho_test.sql
  modified: []

key-decisions:
  - "RPC trả jsonb ton_theo_kho (khóa kho_id::text) thay vì cột kho cố định — D-01 áp ở tầng giao diện, không ở SQL"
  - "p_dang_kinh_doanh dùng nhánh 'is null or' bắt buộc — lọc Tất cả (null) phải trả mọi dòng, không phải 0 dòng"
  - "p_trang_thai_ton dùng lại đúng 4 giá trị của danh_sach_san_pham (0030) để tái dùng bộ lọc duoi_dinh_muc cho TQAN-02"

patterns-established:
  - "Pivot giá trị hàng thành cột động qua jsonb_object_agg khi số lượng cột không cố định trước (lần đầu trong codebase, không có analog trực tiếp trước 0058)"

requirements-completed: []  # TON-01/TQAN-02 nằm trong frontmatter `requirements` của plan này nhưng CHƯA đóng — 8 plan khác trong Phase 5 (05-00, 05-04..05-07, 05-10, 05-11) cũng khai hai mã này vì chúng chỉ hoàn tất khi có UI thật. REQUIREMENTS.md giữ nguyên [ ] Pending, không đánh dấu [x] ở plan này.

# Metrics
duration: 12min
completed: 2026-09-21
---

# Phase 05 Plan 01: RPC danh_sach_ton_kho Summary

**RPC đọc tồn kho pivot theo mã x kho vào jsonb `ton_theo_kho`, phân trang/lọc/đếm hoàn toàn ở server, thủ kho tự giới hạn phạm vi kho ngay trong hàm SECURITY DEFINER.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-21T07:22:00Z (ước lượng từ thời điểm bắt đầu đọc plan)
- **Completed:** 2026-09-21T07:34:42Z
- **Tasks:** 2/2
- **Files modified:** 2 (cả hai đều là file mới)

## Accomplishments
- RPC `public.danh_sach_ton_kho` viết xong: 10 tham số, 15 cột trả về, pivot tồn theo kho vào `ton_theo_kho jsonb`, không cột nào mang giá vốn hay giá trị tồn (D-02)
- pgTAP `32_danh_sach_ton_kho_test.sql` với 10 assertion, phủ đúng: pivot jsonb (đếm khóa + đọc giá trị theo `->>`), lọc `p_kho_id`, lọc `p_trang_thai_ton = 'duoi_dinh_muc'`, tìm không dấu, `tong_so_dong` nhất quán trên toàn tập lọc, phạm vi kho tự áp của thủ kho, và lỗi `42501` khi chưa đăng nhập

## Task Commits

Mỗi task được commit riêng:

1. **Task 1: Viết migration 0058 — RPC danh_sach_ton_kho** - `26eaba5` (feat)
2. **Task 2: Viết pgTAP 32_danh_sach_ton_kho_test.sql** - `93c27a2` (test)

## Files Created/Modified
- `supabase/migrations/0058_rpc_ton_kho.sql` - RPC `danh_sach_ton_kho`, chép khuôn preamble/CTE/phân trang của `danh_sach_san_pham` (0030), thêm CTE `ton` gộp `ton_kho` theo mã bằng `jsonb_object_agg`
- `supabase/tests/32_danh_sach_ton_kho_test.sql` - 10 assertion pgTAP, dữ liệu test dưới tiền tố `TON-ZQX-*`, không đụng dữ liệu thật

## Decisions Made
- Không tạo cột kho cố định (`ton_k1`/`ton_k2`) ở tầng SQL — pivot chỉ tồn tại dưới dạng jsonb, cột thật dựng ở giao diện từ danh sách kho động, khớp đúng cảnh báo của 05-PATTERNS.md ("không được hard-code `'K1'`/`'K2'`")
- Giữ nguyên khuôn `v_kho uuid[] := (select public.kho_hien_tai())` rồi `= any(v_kho)` (không cast lại, vì đã ép kiểu ngay lúc gán biến) — tránh lỗi 42883 mà 0026 đã cảnh báo
- LEFT JOIN `ton` vào `san_pham` (không INNER JOIN) — bắt buộc để mã chưa có `ton_kho` nào vẫn hiện với tồn 0, đúng yêu cầu D-02/nguyên tắc kiến trúc số 1 ("tồn là kết quả")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Cả hai gate tự động (`grep` kiểm `jsonb_object_agg`/không có `gia_von` ngoài comment; `grep` kiểm `plan(`/`grant select on t_tk`/`rollback`) đều in `GATE-OK` ngay lần chạy đầu. Toàn bộ acceptance_criteria bổ sung (đếm `any(v_kho)`, không có `any(public.kho_hien_tai())`, đúng một `create or replace function`, đủ ba câu `revoke`/`grant`/`comment`, không có chuỗi `'K1'`/`'K2'`, có `p_dang_kinh_doanh is null or`, số `plan(n)` khớp đúng số assertion, có cả hai lượt `dang_nhap_nhu`, có `throws_ok` với `42501`) đều xác nhận đạt bằng grep trước khi commit.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần thiết ở plan này.

**Quan trọng — SQL của plan này CHƯA được chạy trên bất kỳ database nào.** Máy làm việc hiện tại không có `.env.local` và Supabase CLI chưa đăng nhập, nên không thể `npm run db:push` hay `npm run db:test:linked`. Việc đẩy migration 0058 và chạy pgTAP 32 lên cloud là công việc của **plan 05-05** (ràng buộc: chỉ một plan được đẩy schema, xem `<verification>` của plan này). Đúng như kế hoạch, không phải thiếu sót — cả gate xác minh của Task 1 và Task 2 đều tự ghi chú rõ điều này ("Kiểm thật nằm ở plan 05-05").

## Ghi chú về REQUIREMENTS.md

Plan này khai `requirements: [TON-01, TQAN-02]` trong frontmatter (đúng theo
05-01-PLAN.md), nhưng **KHÔNG đánh dấu hai mã này "Complete" trong
REQUIREMENTS.md** — chỉ RPC backend vừa xong, chưa có màn hình nào. TON-01
("Xem tồn theo từng kho...") và TQAN-02 ("Xem danh sách mã dưới định mức...")
đều là hành vi NGƯỜI DÙNG nhìn thấy, đòi UI thật (dự kiến ở 05-06/05-07 theo
05-PATTERNS.md Wave 3). Cả hai mã còn xuất hiện trong frontmatter của 7 plan
khác của Phase 5 (05-00, 05-04, 05-05, 05-06, 05-07, 05-10, 05-11) — đóng mã
này sớm sẽ làm bảng traceability nói dối trước khi các plan đó chạy xong.
Đã thử chạy `requirements mark-complete` theo đúng quy trình chuẩn của
state_updates rồi phát hiện sai lệch này, nên đã `git checkout --` để hoàn
tác thay đổi trên `.planning/REQUIREMENTS.md` trước khi commit.

## Next Phase Readiness
- RPC `danh_sach_ton_kho` sẵn sàng để plan 05-06 (lớp dữ liệu client `features/inventory`) dùng làm nguồn cho `InventoryRow`/`toInventoryRow` — kiểu trả về sẽ xuất hiện trong `src/types/database.types.ts` sau khi plan 05-05 chạy `npm run db:types` trên cloud
- Chưa có gì chặn plan 05-02 (dự kiến `0059_the_kho_ton_luy_ke.sql`) — plan đó độc lập với 0058, cùng nằm ở Wave 1 nhưng không phụ thuộc lẫn nhau theo `depends_on: []` của plan này
- Nhắc lại cho người thực thi plan 05-05: đẩy migration theo đúng thứ tự số hiệu (0058 trước các migration Wave 1 khác nếu chúng đã được viết), và chạy pgTAP 32 cùng lượt với các file khác

---
*Phase: 05-ton-kho-tong-quan*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: `supabase/migrations/0058_rpc_ton_kho.sql`
- FOUND: `supabase/tests/32_danh_sach_ton_kho_test.sql`
- FOUND: `.planning/phases/05-ton-kho-tong-quan/05-01-SUMMARY.md`
- FOUND commit `26eaba5` (Task 1)
- FOUND commit `93c27a2` (Task 2)
