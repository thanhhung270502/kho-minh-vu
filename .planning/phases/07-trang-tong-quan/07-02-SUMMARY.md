---
phase: 07-trang-tong-quan
plan: 02
subsystem: database
tags: [postgres, plpgsql, rpc, pgtap, security-definer, ton-kho]

requires:
  - phase: 05-ton-kho-tong-quan
    provides: định nghĩa trạng thái tồn (con_hang/het_hang/am/duoi_dinh_muc) và khuôn danh_sach_ton_kho (0058, vá ở 0067)
  - phase: 05-ton-kho-tong-quan
    provides: khuôn RPC chặn vai trò + revoke/grant (de_xuat_dinh_muc, 0060)
provides:
  - RPC public.ton_theo_nhom(p_theo, p_kho_id) — đếm mã theo nhóm hàng / công đoạn theo trạng thái tồn (TQAN-01)
  - pgTAP 93_ton_theo_nhom_test.sql (24 assertion, RED tại thời điểm commit Task 1)
affects: [07-trang-tong-quan các plan sau (dashboard.api.ts sẽ gọi RPC này để render trang tổng quan), 07-05 (đẩy migration 0069 lên cloud)]

tech-stack:
  added: []
  patterns:
    - "Đếm mã theo nhóm/công đoạn bằng CASE rẽ nhánh (không execute format), lồng CTE trong subquery FROM rồi select lại qua alias v.* để tránh 42702 khi tên cột OUT trùng tên biến (bài học 0059/0062)"
    - "Đối chiếu chéo pgTAP với RPC khác (danh_sach_ton_kho) thay vì neo số liệu cố định — kiểm đúng bất kể dữ liệu thật thay đổi"

key-files:
  created:
    - supabase/tests/93_ton_theo_nhom_test.sql
    - supabase/migrations/0069_ton_theo_nhom.sql
  modified: []

key-decisions:
  - "RPC không nhận tham số kinh doanh — cố định sp.dang_kinh_doanh = true, khớp mặc định của /ton-kho (D-17); không có nhu cầu xem nhóm hàng ngưng kinh doanh trên trang tổng quan"
  - "CTE ton không lọc theo kho được phân của thủ kho (khác danh_sach_ton_kho) vì hàm này chỉ quản lý gọi tới được (đã chặn 42501 trước khi chạm CTE)"
  - "Không chạy pgTAP 93 thật trên cloud ở plan này — không có công cụ MCP khả dụng trong phiên thực thi; đã trace tay toàn bộ 24 assertion so với logic SQL (kể cả bốn ô fixture con_hang/het_hang/am/duoi_dinh_muc theo từng mã) và khớp 100%"

patterns-established:
  - "RPC đếm/báo cáo đọc-only cho quản lý: SECURITY DEFINER, tự kiểm vai_tro_hien_tai() ngay đầu thân hàm trước khi chạm dữ liệu, revoke all từ public/anon rồi grant execute cho authenticated"

requirements-completed: []

duration: ~30min
completed: 2026-09-26
---

# Phase 7 Plan 2: RPC ton_theo_nhom (đếm mã theo nhóm/công đoạn) Summary

**RPC `ton_theo_nhom(p_theo, p_kho_id)` đếm mã hàng theo nhóm/công đoạn ở bốn trạng thái tồn, chép nguyên văn định nghĩa trạng thái của `danh_sach_ton_kho` (0067) và được pgTAP đối chiếu chéo với chính RPC đó trên toàn bộ dữ liệu thật để đảm bảo bấm một con số trên trang tổng quan luôn mở đúng số dòng ở `/ton-kho`.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2/2
- **Files modified:** 2 (cả hai đều file mới)

## Accomplishments
- pgTAP `93_ton_theo_nhom_test.sql`: fixture riêng (nhóm `ZQX-NHOM-93`, công đoạn `ZQX_CD_93`, sáu mã `TN-ZQX-001..006`) phủ đủ năm trạng thái (con_hang, het_hang, am, duoi_dinh_muc, dang_kinh_doanh=false bị loại) và bốn assertion đối chiếu chéo TOÀN BỘ dữ liệu thật (không giả định) với `danh_sach_ton_kho` cho cả `nhom`, `cong_doan`, có/không `p_kho_id`, cộng một assertion tổng `tong_ma` = `tong_so_dong`. 24 assertion tổng cộng, đúng số lời gọi `is`/`throws_ok` thực viết trong file (khớp `plan(24)`).
- Migration `0069_ton_theo_nhom.sql`: RPC `plpgsql stable security definer set search_path to ''`, rẽ nhánh nhóm/công đoạn bằng CASE (không SQL động), điều kiện `duoi_dinh_muc` chép nguyên văn từ 0067, gói CTE trong subquery rồi `select v.* ... order by v.ten_nhom` để tránh lỗi 42702 (tên cột OUT trùng tên cột trả về — bài học 0059/0062).
- Đã trace tay toàn bộ 24 assertion so với logic SQL của RPC (không có MCP để chạy thật): sáu mã fixture cho ra đúng tong_ma=5/con_hang=2/het_hang=2/am=1/duoi_dinh_muc=1 (không lọc kho), con_hang=3/het_hang=1/am=1 (lọc K1), am=1/het_hang=4 (lọc K2) — khớp 100% với mô tả hành vi trong plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: pgTAP 93 — fixture nhóm test + đối chiếu chéo (RED)** - `4f288dc` (test)
2. **Task 2: Migration 0069 — RPC ton_theo_nhom (GREEN)** - `0d5b07c` (feat)

**Plan metadata:** (commit này) - docs

## Files Created/Modified
- `supabase/tests/93_ton_theo_nhom_test.sql` - pgTAP 24 assertion: 14 giá trị cụ thể trên fixture riêng, 4 đối chiếu chéo toàn bộ dữ liệu thật với `danh_sach_ton_kho`, 1 tổng `tong_ma`, 1 whitelist `p_theo` (22023), 3 chặn vai trò (42501)
- `supabase/migrations/0069_ton_theo_nhom.sql` - RPC `public.ton_theo_nhom(p_theo text, p_kho_id uuid)`, revoke/grant, comment

## Decisions Made
- Theo D-17: cố định `sp.dang_kinh_doanh = true`, không thêm tham số kinh doanh cho RPC này (khớp mặc định `/ton-kho`).
- Theo D-08: chốt chặn chính là đối chiếu chéo với `danh_sach_ton_kho` trên TOÀN BỘ nhóm/công đoạn thật (không neo số liệu cố định) — đúng bất kể dữ liệu sản xuất thay đổi.
- CTE `ton` bên trong `ton_theo_nhom` KHÔNG áp phạm vi kho của thủ kho (khác `danh_sach_ton_kho`) vì hàm này chặn 42501 với mọi vai trò khác `quan_ly` ngay đầu thân hàm — không có đường nào để thủ kho/văn phòng chạm tới CTE đó.

## Deviations from Plan

None - plan thực thi đúng như đặc tả.

## Issues Encountered
- Không có công cụ MCP Supabase khả dụng trong phiên thực thi này (đúng ghi chú môi trường của phiên) — Task 2 dừng ở kiểm tĩnh (grep gate) + trace tay logic, KHÔNG chạy pgTAP 93 thật trên cloud. **Việc còn lại cho 07-05:** đẩy migration 0069 lên cloud (`phonzyruoalimgaovljm`) cùng các migration khác của Phase 7, rồi chạy pgTAP 93 (24 assertion) để xác nhận xanh thật, đặc biệt bốn assertion đối chiếu chéo toàn bộ dữ liệu thật (item 5-8) — đây là loại assertion không thể trace tay đầy đủ cho 3.266 mã thật, chỉ có thể tin cậy qua chạy thật.

## User Setup Required

None - không có dịch vụ ngoài cần cấu hình. Migration CHƯA được đẩy lên cloud (đúng chỉ định của plan — "Không đẩy lên cloud ở plan này, việc của 07-05").

## Next Phase Readiness
- Migration 0069 sẵn sàng cho 07-05 đẩy lên cloud cùng 0068 (`bao_cao_xuat_am`) và các RPC khác của Phase 7.
- `dashboard.api.ts` (plan sau) có thể gọi thẳng `ton_theo_nhom(p_theo, p_kho_id)` qua `supabase.rpc(...)` — mỗi dòng trả `nhom_id`/`ten_nhom` để dựng link sang `/ton-kho?nhom_hang_id=<nhom_id>&trang_thai_ton=<trạng_thái>` (hoặc `cong_doan_id=` khi `p_theo='cong_doan'`) đúng khớp số đã đếm (D-08).
- **TQAN-01 CHƯA được đánh dấu hoàn thành** (theo chỉ định môi trường của phiên) — RPC đã sẵn sàng nhưng yêu cầu chỉ đóng khi giao diện trang tổng quan gọi và hiển thị đúng ở một plan sau.
- **Rủi ro cần 07-05 xác nhận:** logic đã trace tay kỹ và cấu trúc SQL đã kiểm chứng bằng grep gate + đối chiếu thủ công với `danh_sach_ton_kho`, nhưng bốn assertion đối chiếu chéo trên TOÀN BỘ dữ liệu thật (item 5-8 trong pgTAP) chỉ có thể xác nhận đáng tin bằng cách chạy thật trên Postgres.

---
*Phase: 07-trang-tong-quan*
*Completed: 2026-09-26*

## Self-Check: PASSED

- FOUND: supabase/tests/93_ton_theo_nhom_test.sql
- FOUND: supabase/migrations/0069_ton_theo_nhom.sql
- FOUND: commit 4f288dc (test: pgTAP 93)
- FOUND: commit 0d5b07c (feat: RPC ton_theo_nhom)
