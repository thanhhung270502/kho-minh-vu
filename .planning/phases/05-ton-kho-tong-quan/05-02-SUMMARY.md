---
phase: 05-ton-kho-tong-quan
plan: 02
subsystem: database
tags: [postgres, window-function, rpc, security-definer, pgtap, ton-kho]

requires:
  - phase: 05-ton-kho-tong-quan
    provides: "05-00 trang bị máy (định nghĩa đang chạy đọc sẵn vào 05-LIVE-DEFS.md)"
provides:
  - "the_kho_san_pham trả thêm cột ton_luy_ke numeric (cột thứ 15) — tồn lũy kế tại đúng thời điểm mỗi dòng thẻ kho phát sinh"
  - "pgTAP 33 phủ thứ tự phá hòa cùng ngày, bất biến với ton_kho, và lũy kế không bị phân trang cắt"
affects: ["05-05 (đẩy migration 0059 + pgTAP 33 lên cloud)", "WU-8 (thẻ kho UI dùng ton_luy_ke qua StockCardRow.runningBalance)"]

tech-stack:
  added: []
  patterns:
    - "drop function + create function khi đổi RETURNS TABLE của hàm đã có người gọi (khuôn 0029)"
    - "window function sum(...) filter (where ...) over (order by ... rows unbounded preceding) cho running balance — lần đầu dùng trong dự án"
    - "cửa sổ tính TRÊN TOÀN BỘ tập dữ liệu (trong CTE), order by + limit/offset chỉ ở lớp ngoài cùng — lũy kế không bị cắt khi phân trang"

key-files:
  created:
    - supabase/migrations/0059_the_kho_ton_luy_ke.sql
    - supabase/tests/33_the_kho_luy_ke_test.sql
  modified: []

key-decisions:
  - "Chỉ dòng HE_THONG được cộng vào ton_luy_ke; dòng KIOTVIET_NHAP/KIOTVIET_BAN trả null — đi ngược khuyến nghị WU-2 điểm 2 của 05-PATTERNS.md (cộng cả dòng KiotViet) một cách có chủ đích, vì D-05 (plan 05-04) nạp tồn KiotViet vào bằng một chứng từ DIEU_CHINH đã bao gồm hiệu ứng ròng của toàn bộ lịch sử đó; cộng thêm từng dòng KiotViet sẽ đếm hai lần và phá vỡ bất biến 'dòng mới nhất = ton_kho hiện tại'"
  - "Thứ tự phá hòa dùng (ngay, created_at/nap_luc, id) ở CẢ cửa sổ tính lũy kế (asc) lẫn order by ngoài cùng (desc) — chỉ ngay không đủ vì mọi biến động trong cùng một ngày chứng từ (kiểu date ép sang timestamptz) rơi đúng nửa đêm, hòa nhau"
  - "Lũy kế tính SAU khi áp p_kho_id (lọc kho xảy ra trong CTE tat_ca, trước cửa sổ) — lũy kế của một kho khác lũy kế toàn công ty, và bất biến với ton_kho chỉ đúng khi tính đúng phạm vi đang xem"

requirements-completed: []

duration: ~15min
completed: 2026-09-21
---

# Phase 5 Plan 2: Tồn lũy kế tại thời điểm trong thẻ kho Summary

**Thêm cột `ton_luy_ke` (running balance qua window function) vào RPC `the_kho_san_pham` đã có, chỉ cộng dồn biến động hệ thống, chốt thứ tự phá hòa bằng `(ngay, created_at, id)` ở cả cửa sổ tính lẫn `order by` ngoài cùng — chưa chạy trên database nào, chờ plan 05-05 đẩy lên cloud.**

## Performance

- **Duration:** ~15 phút
- **Completed:** 2026-09-21
- **Tasks:** 3/3 hoàn thành, autonomous (không có checkpoint)
- **Files modified:** 2 (1 file mới migration, 1 file mới pgTAP)

## Accomplishments

- Đọc định nghĩa ĐANG CHẠY của `the_kho_san_pham` từ cloud (do phiên điều phối đọc hộ, ghi vào `05-LIVE-DEFS.md` lúc 2026-09-21 09:24 UTC) và xác nhận **khớp hoàn toàn** với `supabase/migrations/0031_the_kho_san_pham.sql` trong repo — không có phiên nào khác ghi đè hàm này, không cần dừng plan.
- Viết migration `0059`: `drop` + `create` lại `the_kho_san_pham` với cột thứ 15 `ton_luy_ke numeric`, dùng window function `sum(...) filter (where la_he_thong) over (order by sx_ngay asc, sx_phu asc, sx_id asc rows unbounded preceding)` — kỹ thuật running-balance đầu tiên trong dự án (05-PATTERNS.md xác nhận không có analog nào khác dùng `sum(...) over (...)` ngoài `count(*) over ()`).
- Giữ nguyên đúng 14 cột cũ (tên, kiểu, thứ tự), giữ nguyên mọi điều kiện quyền/lọc (`v_vai_tro is null` → 42501, phạm vi kho thủ kho, `v_xem_gv`, `v_xem_kv`), cấp lại quyền `revoke`/`grant`/`comment` đầy đủ sau `drop`.
- Viết pgTAP `33_the_kho_luy_ke_test.sql` với 9 assertion phủ: thứ tự phá hòa cùng ngày theo `created_at`, tổng lũy kế toàn công ty, bất biến với `ton_kho` khi lọc theo kho, dòng KiotViet trả `null`, lũy kế không bị phân trang cắt (`p_kich_thuoc := 1, p_trang := 2`), 14 cột cũ chưa bị đảo, và phạm vi kho của thủ kho.

## Task Commits

Mỗi task được commit riêng:

1. **Task 1: Đọc định nghĩa đang chạy của `the_kho_san_pham` trên cloud** - `73fcf17` (docs) — dán nguyên văn `pg_get_functiondef` (từ `05-LIVE-DEFS.md`, do phiên điều phối đọc hộ vì môi trường thực thi không có kết nối database) vào header, kèm mốc thời gian đọc và kết luận đối chiếu khớp/lệch.
2. **Task 2: Viết migration 0059 — drop, create lại với cột `ton_luy_ke`** - `9a0fdcd` (feat)
3. **Task 3: Viết pgTAP `33_the_kho_luy_ke_test.sql`** - `f2b3da8` (test)

**Plan metadata:** commit này (docs: complete plan)

## Files Created/Modified

- `supabase/migrations/0059_the_kho_ton_luy_ke.sql` — header dán nguyên văn định nghĩa cloud (verbatim, không chép từ file 0031 trong repo dù kết luận là khớp), `drop function` rồi `create function` với 15 cột trả về, cửa sổ running-balance, cấp lại quyền đầy đủ.
- `supabase/tests/33_the_kho_luy_ke_test.sql` — pgTAP 9 assertion, dữ liệu test: mã `LK-ZQX-001`, hai kho K1/K2, hai biến động cùng ngày (2026-07-02) khác `created_at`, một dòng KiotViet cũ (2026-07-01).

## Decisions Made

- **Chỉ cộng dòng HE_THONG vào lũy kế, dòng KiotViet trả null** — đi ngược khuyến nghị 05-PATTERNS.md WU-2 điểm 2 (đề xuất cộng cả KiotViet), theo đúng `<design_decisions>` mục 2 của `05-02-PLAN.md`. Lý do: D-05 (plan 05-04, chưa chạy) sẽ nạp tồn KiotViet vào bằng MỘT chứng từ `DIEU_CHINH` đã bao gồm hiệu ứng ròng của toàn bộ lịch sử KiotViet — cộng thêm từng dòng KiotViet riêng lẻ sẽ đếm hai lần và làm bất biến "dòng mới nhất = tồn hiện tại" không bao giờ đúng. Không "sửa lại cho khớp" PATTERNS.md như văn bản plan đã cảnh báo trước.
- **Thứ tự phá hòa `(ngay, created_at/nap_luc, id)` bắt buộc ở CẢ hai chỗ** — cửa sổ tính lũy kế (`asc`) và `order by` ngoài cùng (`desc`, đảo chiều đúng bộ khóa). Bản đang chạy trên cloud (đọc ở Task 1) chỉ `order by ngay desc` — đúng lỗi mà migration này sửa, vì nghiệp vụ ~92 phiếu xuất/ngày khiến nhiều dòng cùng ngày chứng từ hòa nhau nếu chỉ so `ngay`.
- **Lũy kế tính SAU khi áp `p_kho_id`** (lọc trong CTE `tat_ca`, trước cửa sổ `voi_luy_ke`) — lũy kế "một kho" và "toàn công ty" là hai con số khác nhau có chủ đích; bất biến với `ton_kho` (pgTAP assertion 3) chỉ đúng khi tính đúng phạm vi đang xem.
- **Dùng `filter (where la_he_thong)` thay vì `case when ... else 0 end`** trong window function — cả hai cách cho cùng kết quả theo `<design_decisions>` của plan, chọn `filter` vì Postgres hỗ trợ đầy đủ FILTER clause trên window aggregate (không phải chỉ aggregate thường), code gọn hơn.

## Deviations from Plan

None - plan thực thi đúng như đặc tả, kể cả điểm cố ý đi ngược khuyến nghị của 05-PATTERNS.md (đã được `<design_decisions>` của chính plan này cho phép và giải thích lý do).

## Known Stubs

Không có. Migration và pgTAP là toàn bộ output của plan này — không có UI hay data source nào bị stub.

## Threat Flags

Không có bề mặt bảo mật mới ngoài `<threat_model>` đã khai trong `05-02-PLAN.md` (T-05-05..T-05-08). Migration chỉ mở rộng một RPC đã có, giữ nguyên toàn bộ điều kiện quyền/phạm vi kho, không thêm endpoint/bảng/đường ghi mới.

## Verification

- `npm run check` (typecheck + lint + build): **exit 0**.
- Gate tự động của cả 3 task (`grep` kiểm cấu trúc SQL theo `05-02-PLAN.md`): **GATE-OK** cả 3 lần chạy đầu tiên.
- Số `select is(`/`select ok(` trong pgTAP 33 = 9, khớp đúng `select plan(9)`.
- **CHƯA chạy SQL trên bất kỳ database nào** — máy thực thi này không có `.env.local`/kết nối cloud. Đẩy migration `0059` và chạy pgTAP `33` thật là việc của **plan 05-05** (ràng buộc: chỉ một plan được đẩy schema trong Phase 5, theo đúng tiền lệ 05-01).
- Không sửa `supabase/migrations/0031_the_kho_san_pham.sql` (file lịch sử, giữ nguyên).

## Ghi chú cho REQUIREMENTS.md

Theo chỉ định rõ ràng của orchestrator cho lượt thực thi này: **KHÔNG** đánh dấu `TON-02` hoàn thành trong `REQUIREMENTS.md` dù frontmatter của `05-02-PLAN.md` liệt kê `requirements: [TON-02]` — chưa có màn hình nào hiển thị cột `ton_luy_ke` này (WU-8, sửa `stock-card.tsx`, là một plan khác của Wave 3, chưa thực thi). `TON-02` chỉ nên đánh dấu xong khi WU-8 hoàn thành và thẻ kho UI thật sự hiển thị được cột này.

## Self-Check: PASSED

- `supabase/migrations/0059_the_kho_ton_luy_ke.sql`: FOUND
- `supabase/tests/33_the_kho_luy_ke_test.sql`: FOUND
- Commit `73fcf17`: FOUND
- Commit `9a0fdcd`: FOUND
- Commit `f2b3da8`: FOUND
