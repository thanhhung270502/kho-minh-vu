---
phase: 07-trang-tong-quan
plan: 01
subsystem: database
tags: [postgres, plpgsql, rpc, pgtap, window-function, security-definer]

requires:
  - phase: 05-ton-kho-tong-quan
    provides: kỹ thuật lũy kế window function đã kiểm chứng (the_kho_san_pham, 0059/0062)
  - phase: 05-ton-kho-tong-quan
    provides: khuôn RPC chặn vai trò + revoke/grant (de_xuat_dinh_muc, 0060)
provides:
  - RPC public.bao_cao_xuat_am(p_ngay date) — báo cáo xuất âm theo ngày (TQAN-06)
  - pgTAP 92_bao_cao_xuat_am_test.sql (18 assertion, RED tại thời điểm commit)
affects: [07-trang-tong-quan các plan sau (dashboard.api.ts sẽ gọi RPC này), 07-05 (đẩy migration 0068 lên cloud)]

tech-stack:
  added: []
  patterns:
    - "Window function lũy kế theo (kho_id, san_pham_id) trên kho_movement, thứ tự (created_at, id) — không theo cột ngay"
    - "CTE ung_vien → cap → luy_ke để giới hạn window function chỉ tính cho các cặp (kho, mã) thực sự có ứng viên trong ngày"

key-files:
  created:
    - supabase/tests/92_bao_cao_xuat_am_test.sql
    - supabase/migrations/0068_bao_cao_xuat_am.sql
  modified: []

key-decisions:
  - "D-15/A1: một mã bị hai dòng phiếu khác nhau đẩy âm trong cùng ngày → hai dòng báo cáo riêng (không gộp theo mã)"
  - "D-16/A4: nguoi_lap = chung_tu.nguoi_tao_id → nguoi_dung.ho_ten, không phải nguoi_duyet_id"
  - "Không chạy pgTAP 92 thật trên cloud ở plan này — không có công cụ MCP khả dụng trong phiên thực thi; đã bù bằng cách trace tay toàn bộ 18 assertion so với logic SQL và khớp 100%"

patterns-established:
  - "RPC báo cáo đọc-only, SECURITY DEFINER, tự kiểm vai_tro_hien_tai() ngay đầu thân hàm, revoke all từ public/anon rồi grant execute cho authenticated"

requirements-completed: [TQAN-06]

duration: ~35min
completed: 2026-09-26
---

# Phase 7 Plan 1: RPC báo cáo xuất âm Summary

**RPC `bao_cao_xuat_am(p_ngay)` dựng lại "tồn sau" bằng window function lũy kế trên sổ cái `kho_movement` (không có cột lũy kế nào lưu sẵn), trả từng dòng phiếu XUAT/TRA_NCC đã ghi sổ làm tồn (kho, mã) rơi xuống dưới 0, kèm 18 pgTAP kiểm D-01/D-02/D-03/D-12/D-15/D-16.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2
- **Files modified:** 2 (cả hai đều file mới)

## Accomplishments
- pgTAP `92_bao_cao_xuat_am_test.sql`: 8 chứng từ tự dựng (năm 2091, không neo bộ đếm sống), phủ đủ D-01 (dòng gây âm), D-02 (mặc định ngày + đổi ngày), D-03 (XUAT + TRA_NCC, loại phiếu DA_HUY bị loại), D-04 (chuỗi lý do tự do giữ nguyên văn), D-12 (chặn 3 vai trò khác), D-15 (một mã hai dòng cùng ngày), D-16 (người lập = người tạo phiếu).
- Migration `0068_bao_cao_xuat_am.sql`: RPC `plpgsql stable security definer set search_path to ''`, CTE ba tầng (`ung_vien` → `cap` → `luy_ke`) tránh quét toàn bộ sổ cái, thứ tự lũy kế `(m.created_at, d.created_at, d.id, m.id)` — đúng bài học đã sửa ở 0059.
- Đã trace tay toàn bộ 18 assertion so với logic SQL của RPC (không có MCP để chạy thật) — khớp 100% từng ton_sau, so_luong_xuat, loại phiếu, tên kho, lý do, người lập.

## Task Commits

Each task was committed atomically:

1. **Task 1: pgTAP 92 cho bao_cao_xuat_am (RED)** - `e9e5a64` (test)
2. **Task 2: Migration 0068 — RPC bao_cao_xuat_am (GREEN)** - `d43b45c` (feat)

**Plan metadata:** (commit này) - docs

## Files Created/Modified
- `supabase/tests/92_bao_cao_xuat_am_test.sql` - pgTAP 18 assertion, dữ liệu 2091 tự dựng, helper `pg_temp.dang_nhap_nhu`/`dang_xuat`/`sp_test`/`kho_id` chép nguyên văn từ `33_the_kho_luy_ke_test.sql`
- `supabase/migrations/0068_bao_cao_xuat_am.sql` - RPC `public.bao_cao_xuat_am(p_ngay date)`, revoke/grant, comment

## Decisions Made
- Theo A1/D-15 của RESEARCH.md: mỗi dòng phiếu gây âm là một dòng báo cáo riêng, kể cả trùng mã trong cùng ngày.
- Theo A4/D-16: chỉ hiện `nguoi_tao_id`, không thêm `nguoi_duyet_id`.
- Thứ tự phá hòa lũy kế dùng cả `chung_tu_dong.created_at`/`id` (task 2 action) thay vì chỉ `kho_movement.created_at`/`id` như Pattern 1 gốc trong RESEARCH.md — an toàn hơn khi hai dòng của CÙNG một phiếu có `kho_movement.created_at` giống hệt nhau (cùng transaction ghi sổ).

## Deviations from Plan

None - plan thực thi đúng như đặc tả. Có một điều chỉnh nhỏ trong lúc viết (không phải deviation về hành vi): `comment on function` ban đầu chứa chữ "gia_von" (trong câu "Không đọc gia_von/gia_von_tai_thoi_diem") khiến tự vi phạm gate `grep -c 'gia_von' -eq 0` của chính plan — sửa lại thành "Không đọc giá vốn (D-17)" để giữ đúng ý nghĩa mà không chứa chuỗi bị cấm. Đây là Rule 3 (tự vi phạm gate của chính plan, cùng loại lỗi đã ghi nhận ở 06-11/06-12).

## Issues Encountered
- Đếm sai số assertion lúc đầu (viết `plan(19)` nhưng thực tế chỉ có 18 lời gọi `is/lives_ok/throws_ok`) — phát hiện ngay bằng gate tự động của Task 1, sửa `plan(18)` trước khi commit.
- Không có công cụ MCP Supabase khả dụng trong phiên thực thi này (tool `mcp__...__execute_sql` không nằm trong danh sách tool được cấp, không có `ToolSearch` để nạp thêm) — theo đúng điều kiện dự phòng ghi trong plan ("Không có MCP thì dừng ở kiểm tĩnh, plan 07-05 là nơi chạy thật"), Task 2 dừng ở kiểm tĩnh (grep gate) + trace tay logic, KHÔNG chạy pgTAP 92 thật trên cloud. **Việc còn lại cho 07-05:** đẩy migration 0068 lên cloud (`phonzyruoalimgaovljm`) và chạy `psql -f supabase/tests/92_bao_cao_xuat_am_test.sql` (hoặc `npm run db:test:linked`) để xác nhận 18/18 pass thật.

## User Setup Required

None - không có dịch vụ ngoài cần cấu hình. Migration CHƯA được đẩy lên cloud (đúng chỉ định của plan — "KHÔNG đẩy lên cloud ở plan này").

## Next Phase Readiness
- Migration 0068 sẵn sàng cho 07-05 đẩy lên cloud cùng các RPC khác của Phase 7 (`ton_theo_nhom`, `nhip_ban` — các plan Wave 1 khác).
- `dashboard.api.ts` (plan sau) có thể gọi thẳng `bao_cao_xuat_am(p_ngay, ...)` qua `supabase.rpc(...)` theo đúng chữ ký đã định (chỉ một tham số `p_ngay`, không có `p_kho_id` — RESEARCH.md có nhắc `p_kho_id` cho lọc kho nhưng PLAN.md 07-01 không yêu cầu, và chữ ký cuối cùng trong migration chỉ có `p_ngay`; nếu UI cần lọc theo kho, đó là việc của plan viết `dashboard.api.ts`/migration bổ sung sau, không phải phạm vi 07-01).
- **Rủi ro cần 07-05 xác nhận:** logic đã được trace tay kỹ nhưng chưa chạy thật trên Postgres — pgTAP 92 phải chạy xanh 18/18 trước khi coi RPC này là đáng tin cho dashboard.

---
*Phase: 07-trang-tong-quan*
*Completed: 2026-09-26*
