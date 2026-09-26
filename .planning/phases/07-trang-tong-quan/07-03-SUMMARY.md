---
phase: 07-trang-tong-quan
plan: 03
subsystem: database
tags: [postgres, plpgsql, rpc, pgtap, security-definer]

requires:
  - phase: 05-ton-kho-tong-quan
    provides: khuôn RPC chặn vai trò + revoke/grant (de_xuat_dinh_muc, 0060)
  - phase: 06-kiem-ke-go-live
    provides: tiền lệ "hôm nay theo giờ Việt Nam" (0066_kiem_ke_duyet.sql)
provides:
  - RPC public.nhip_ban(p_ngay date) — nhịp bán hôm nay so với hôm qua (TQAN-07)
  - pgTAP 94_nhip_ban_test.sql (14 assertion, RED tại thời điểm commit Task 1)
affects: [07-trang-tong-quan các plan sau (dashboard.api.ts sẽ gọi RPC này), 07-05 (đẩy migration 0070 lên cloud)]

tech-stack:
  added: []
  patterns:
    - "CTE khung (hai ngày) LEFT JOIN dem + coalesce về 0 — ngày trống vẫn có dòng, không cần giao diện tự bù"
    - "Tên cột CTE khác tên biến OUT của RETURNS TABLE (d_ngay vs ngay) — tránh 42702 khi SELECT cuối chiếu ra cột trùng tên OUT parameter"

key-files:
  created:
    - supabase/tests/94_nhip_ban_test.sql
    - supabase/migrations/0070_nhip_ban.sql
  modified: []

key-decisions:
  - "Không đọc don_dat_hang (D-10) — chỉ chung_tu/chung_tu_dong, đơn chưa xuất không tính"
  - "Không chạy pgTAP 94 thật trên cloud ở plan này — không có công cụ MCP Supabase khả dụng trong phiên thực thi; đã bù bằng trace tay toàn bộ 14 assertion so với logic SQL và khớp 100%"

patterns-established:
  - "RPC báo cáo đơn giản (không window function): CTE khung hai ngày LEFT JOIN dem, coalesce ba cột đếm về 0"

requirements-completed: []

duration: ~20min
completed: 2026-09-26
---

# Phase 7 Plan 3: RPC nhịp bán hôm nay/hôm qua Summary

**RPC `nhip_ban(p_ngay)` đếm số phiếu xuất/số dòng/số mã khác nhau của phiếu XUAT đã ghi sổ cho hai ngày liền nhau (hôm nay + hôm qua), dựng CTE khung hai ngày LEFT JOIN với số đếm thật rồi coalesce về 0 để ngày trống vẫn có dòng — kèm 14 pgTAP kiểm D-09/D-10/D-12.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2
- **Files modified:** 2 (cả hai đều file mới)

## Accomplishments
- pgTAP `94_nhip_ban_test.sql`: 8 chứng từ tự dựng (năm 2092, không neo bộ đếm sống), gán thẳng vào `chung_tu`/`chung_tu_dong` (không qua `ghi_so_chung_tu` — RPC này chỉ đọc hai bảng đó, không đọc `kho_movement`). Phủ đủ D-09 (hôm nay/hôm qua, mặc định giờ VN), D-10 (chỉ XUAT `HOAN_THANH`, loại `DA_HUY`/`NHAP_LIEU`/`NHAP`/`TRA_NCC` đều bị loại), ngày trống vẫn có dòng ba số 0, D-12 (chặn 3 vai trò khác quản lý).
- Migration `0070_nhip_ban.sql`: RPC `plpgsql stable security definer set search_path to ''`, CTE `khung` (hai ngày `p_ngay`, `p_ngay - 1`) LEFT JOIN `dem` (đếm thật), coalesce ba cột đếm về 0. Tên cột CTE (`d_ngay`) khác tên biến OUT (`ngay`) — tránh lỗi 42702 đã gặp ở 0059/0062.
- Đã trace tay toàn bộ 14 assertion so với logic SQL của RPC (không có MCP để chạy thật) — khớp 100% từng số phiếu/dòng/mã cho cả hai ngày, cả hai ngày trống, và mặc định giờ VN.

## Task Commits

Each task was committed atomically:

1. **Task 1: pgTAP 94 cho nhip_ban (RED)** - `8a68fd1` (test)
2. **Task 2: Migration 0070 — RPC nhip_ban (GREEN)** - `9c605f5` (feat)

**Plan metadata:** (commit này) - docs

## Files Created/Modified
- `supabase/tests/94_nhip_ban_test.sql` - pgTAP 14 assertion, dữ liệu 2092 tự dựng, helper `pg_temp.dang_nhap_nhu`/`dang_xuat`/`sp_test`/`kho_id` chép nguyên văn từ `33_the_kho_luy_ke_test.sql`
- `supabase/migrations/0070_nhip_ban.sql` - RPC `public.nhip_ban(p_ngay date default hôm nay giờ VN)`, revoke/grant, comment

## Decisions Made
- D-10 xác nhận qua fixture: NHAP, DA_HUY, NHAP_LIEU, TRA_NCC đều bị loại — chỉ P1/P2 (XUAT HOAN_THANH) được đếm vào ngày 2092-03-15, chỉ P7 vào 2092-03-14; P8 (2092-03-13, 5 dòng) nằm ngoài khung hai ngày nên không ảnh hưởng.
- Ngày trống (2092-03-17, không phiếu nào) vẫn trả đúng 2 dòng nhờ `khung LEFT JOIN dem` + `coalesce(..., 0)` — không cần logic bù ở giao diện.

## Deviations from Plan

**1. [Rule 1 - Bug tự vi phạm gate của chính plan]** — Bản nháp đầu của `comment on function` chứa nguyên văn chuỗi `don_dat_hang` (trong câu "Không đọc don_dat_hang") khiến tự vi phạm gate `test "$(grep -v '^\s*--' $f | grep -c 'don_dat_hang')" -eq 0` của chính Task 2 (dòng comment SQL này không có tiền tố `--` nên gate không loại trừ nó). Sửa lại câu chữ thành "Chỉ đọc chung_tu/chung_tu_dong, không đọc đơn đặt hàng (D-10)" — giữ đúng ý nghĩa, không chứa chuỗi bị cấm. Cùng loại lỗi đã ghi nhận ở 06-11/06-12/07-01 (0 dòng code, chỉ sửa văn bản comment, không có commit riêng vì phát hiện trước khi commit).

## Issues Encountered
- Không có công cụ MCP Supabase khả dụng trong phiên thực thi này (không có tool `mcp__...__execute_sql` hay tương đương trong danh sách tool được cấp). Theo đúng điều kiện dự phòng ghi trong plan ("Không có MCP thì dừng ở kiểm tĩnh, plan 07-05 là nơi chạy thật"), Task 2 dừng ở kiểm tĩnh (grep gate) + trace tay logic, KHÔNG chạy pgTAP 94 thật trên cloud. **Việc còn lại cho 07-05:** đẩy migration 0070 lên cloud (`phonzyruoalimgaovljm`) và chạy `psql -f supabase/tests/94_nhip_ban_test.sql` (hoặc `npm run db:test:linked`) để xác nhận 14/14 pass thật, cùng lúc với `0068_bao_cao_xuat_am.sql`/`0069_ton_theo_nhom.sql` của các plan Wave 1 khác.

## User Setup Required

None - không có dịch vụ ngoài cần cấu hình. Migration CHƯA được đẩy lên cloud (đúng chỉ định của plan — "KHÔNG đẩy lên cloud ở plan này").

## Next Phase Readiness
- Migration 0070 sẵn sàng cho 07-05 đẩy lên cloud cùng `0068`/`0069`.
- `dashboard.api.ts` (plan sau, dùng `src/features/dashboard/`) có thể gọi thẳng `nhip_ban(p_ngay?)` qua `supabase.rpc(...)` — chữ ký chỉ một tham số tùy chọn `p_ngay`, không có `p_kho_id` (đúng đặc tả D-09, nhịp bán không lọc theo kho).
- **Rủi ro cần 07-05 xác nhận:** logic đã được trace tay kỹ nhưng chưa chạy thật trên Postgres — pgTAP 94 phải chạy xanh 14/14 trước khi coi RPC này là đáng tin cho dashboard.
- **KHÔNG đánh dấu TQAN-07 hoàn thành** trong REQUIREMENTS.md dù frontmatter plan liệt kê — theo chỉ định của orchestrator, TQAN-07 chỉ đóng khi UI (`sales-pace-card.tsx`, plan sau) ghép RPC này vào trang tổng quan thật.

---
*Phase: 07-trang-tong-quan*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: supabase/tests/94_nhip_ban_test.sql
- FOUND: supabase/migrations/0070_nhip_ban.sql
- FOUND: .planning/phases/07-trang-tong-quan/07-03-SUMMARY.md
- FOUND commit: 8a68fd1 (test)
- FOUND commit: 9c605f5 (feat)
