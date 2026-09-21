---
phase: 05-ton-kho-tong-quan
plan: 04
subsystem: database
tags: [postgres, plpgsql, supabase, rpc, pgtap, chung-tu, dieu-chinh]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 00)
    provides: xác nhận môi trường (npm ci, .env.local công khai, npm run check xanh) + đọc định nghĩa cloud vào 05-LIVE-DEFS.md
provides:
  - "RPC public.nap_ton_tam(jsonb, uuid, boolean) — nạp tồn KiotViet làm số tạm qua đúng một chứng từ DIEU_CHINH đã ghi sổ"
  - "Bản vá public._ghi_so_dieu_chinh theo kho từng dòng (coalesce(p_dong.kho_id, p_ct.kho_id)) — quyết định người dùng 2026-09-21"
  - "pgTAP 35_nap_ton_tam_test.sql (21 assertion) — CHƯA chạy trên bất kỳ database nào"
affects: [05-ton-kho-tong-quan (plan 05, 09, 10 — màn dưới định mức + upload nạp tồn tạm), 05-05 (đẩy schema 0058-0061 lên cloud), Phase 6 (kiểm kê thật, lọc ghi_chu like '[NAP_TON_TAM]%')]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ghép hai khuôn RPC: xem trước/bỏ qua-mã-đã-có-dữ-liệu-thật (dat_gia_von_dau_ky 0044) + dựng-một-chứng-từ-atomic-rồi-tự-ghi-sổ (tao_phieu_xuat_tu_don 0056)"
    - "Vá hàm _ghi_so_* nội bộ ngay trong migration của caller khi caller là nơi ĐẦU TIÊN cần hành vi mới (giống cách 0051 vá theo yêu cầu XUAT/TRA_NCC/TRA_KHACH)"

key-files:
  created:
    - supabase/migrations/0061_nap_ton_tam.sql
    - supabase/tests/35_nap_ton_tam_test.sql
  modified: []

key-decisions:
  - "Task 1 fire đúng điều kiện dừng đã cài (_ghi_so_dieu_chinh bản cloud vẫn dùng p_ct.kho_id) — đã báo người dùng, người dùng chọn phương án (a) vá hàm ngay trong 0061, không tách hai phiếu, không hoãn plan"
  - "_ghi_so_dieu_chinh vá đúng MỘT chỗ (kho_id -> coalesce(p_dong.kho_id, p_ct.kho_id)), giữ nguyên dấu so_luong và cách lấy gia_von — copy nguyên văn từ 05-LIVE-DEFS.md, không gõ lại theo trí nhớ"
  - "Điều kiện bỏ qua (bo_qua) của nap_ton_tam là ĐÃ CÓ kho_movement thật, không phải ton_kho.so_luong <> 0 — một mã tồn 0 vì đã xuất hết khác mã tồn 0 vì chưa từng có chứng từ"
  - "Chỉ vai trò quan_ly (hẹp hơn D-04 quan_ly+van_phong có chủ đích) — việc một lần, hậu quả trải khắp báo cáo tồn"
  - "Kho của từng dòng = san_pham.kho_mac_dinh_id trước, dự phòng p_kho_mac_dinh — ưu tiên mã tự có kho hơn tham số người nạp chọn"

patterns-established:
  - "Tiền tố cố định [NAP_TON_TAM] ở đầu chung_tu.ghi_chu — Phase 6 lọc bằng ghi_chu like '[NAP_TON_TAM]%' thay vì so khớp câu tiếng Việt dài"

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-09-21
---

# Phase 5 Plan 4: nap_ton_tam — nạp tồn KiotViet làm số tạm qua chứng từ DIEU_CHINH Summary

**RPC `nap_ton_tam(jsonb, uuid, boolean)` dựng một chứng từ `DIEU_CHINH` đa dòng-đa kho rồi tự gọi `ghi_so_chung_tu`, cộng bản vá `_ghi_so_dieu_chinh` để kho theo từng dòng có hiệu lực — CHƯA chạy SQL trên bất kỳ database nào.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-21
- **Tasks:** 3/3 hoàn thành (autonomous, không checkpoint)
- **Files modified:** 2 (1 tạo mới migration, 1 tạo mới pgTAP)

## Accomplishments

- Header migration `0061` ghi lại nguyên văn ba kết luận đọc từ database đang chạy (từ `05-LIVE-DEFS.md`, đọc lúc 2026-09-21 09:24 UTC bởi phiên điều phối): `_ghi_so_dieu_chinh` vẫn ghi kho đầu phiếu, `ghi_so_chung_tu` còn nhánh `DIEU_CHINH`, enum `loai_ct` đủ bảy nhãn — điều kiện dừng của Task 1 đã fire đúng như thiết kế.
- Vá `public._ghi_so_dieu_chinh` theo quyết định người dùng 2026-09-21: kho lấy theo `coalesce(p_dong.kho_id, p_ct.kho_id)` thay vì luôn `p_ct.kho_id`, đúng khuôn 0051 đã dùng cho `_ghi_so_xuat`/`_ghi_so_tra_ncc`/`_ghi_so_tra_khach`. Tương thích ngược (dòng không chọn kho vẫn rơi về kho đầu phiếu).
- RPC `public.nap_ton_tam(p_du_lieu jsonb, p_kho_mac_dinh uuid, p_chi_kiem_tra boolean)`: phân loại `dat`/`bo_qua`/`loi`, xem trước không ghi gì, chặn chứng từ rỗng (không nạp gì thì không tạo phiếu), dựng MỘT chứng từ `DIEU_CHINH` nhiều dòng nhiều kho rồi tự `perform ghi_so_chung_tu` trong cùng transaction, không bọc `exception when others`.
- pgTAP `35_nap_ton_tam_test.sql`: 21 assertion — xem trước không ghi, bỏ qua mã đã có chứng từ thật, chuyển nhóm khi có `p_kho_mac_dinh`, một chứng từ hai dòng hai kho khớp đúng `kho_movement.kho_id` và `ton_kho` từng kho, `trang_thai = HOAN_THANH`, tiền tố `[NAP_TON_TAM]`, idempotent (gọi thật lần hai không sinh thêm chứng từ), chặn `van_phong`/`thu_kho` (42501) ở cả hai chế độ.

## Task Commits

1. **Task 1: Xác minh trên cloud ba thứ mà nap_ton_tam dựa vào** - `c1aa677` (docs) — chỉ khối header, chưa có hàm SQL nào
2. **Task 2: Viết migration 0061 — RPC nap_ton_tam** - `4e69e79` (feat) — bản vá `_ghi_so_dieu_chinh` + RPC `nap_ton_tam`
3. **Task 3: Viết pgTAP 35_nap_ton_tam_test.sql** - `d226a77` (test)

_Không có commit "plan metadata" riêng — commit cuối của phần này chính là commit đóng plan cùng STATE.md/ROADMAP.md (xem dưới)._

## Files Created/Modified

- `supabase/migrations/0061_nap_ton_tam.sql` - Header ghi ba kết luận đọc từ cloud + quyết định người dùng; bản vá `public._ghi_so_dieu_chinh`; RPC `public.nap_ton_tam`
- `supabase/tests/35_nap_ton_tam_test.sql` - pgTAP 21 assertion cho `nap_ton_tam`

## Decisions Made

- **Vá `_ghi_so_dieu_chinh` ngay trong `0061`, không tách migration riêng, không tách hai phiếu, không hoãn plan** — quyết định của người dùng sau khi Task 1 báo cáo điều kiện dừng đã fire (xem `05-LIVE-DEFS.md` mục "Quyết định cho 05-04"). An toàn vì 0 chứng từ `DIEU_CHINH` tồn tại lúc vá và hành vi cũ (kho đầu phiếu) vẫn giữ nguyên cho dòng không chọn kho riêng.
- **Không assert số hiệu chứng từ cụ thể trong pgTAP** (Bẫy 16 CLAUDE.md — `chuoi_so_ct` là bộ đếm sống) — chỉ assert `so_ct is not null`.
- **Dùng năm/mã test riêng biệt (`NT-ZQX-*`)** không trùng dữ liệu KiotViet thật, và setup dữ liệu (bao gồm chứng từ NHAP có sẵn cho `NT-ZQX-B`) chạy dưới quyền `postgres` mặc định (bypass RLS), đúng khuôn các file test khác.

## Deviations from Plan

### Auto-fixed / Documented Issues

**1. [Rule 2 — điều chỉnh theo quyết định người dùng đã duyệt] Vá `_ghi_so_dieu_chinh` trong `0061`**
- **Found during:** Task 1 — điều kiện dừng đã cài sẵn trong plan fire đúng như thiết kế (bản cloud của `_ghi_so_dieu_chinh` vẫn ghi kho đầu phiếu).
- **Nguồn quyết định:** không phải quyết định tự đưa ra tại chỗ — phiên điều phối đã báo người dùng TRƯỚC khi giao việc này, người dùng đã chọn phương án (a) trong ba phương án, ghi lại nguyên văn ở `05-LIVE-DEFS.md` mục "Quyết định cho 05-04 — người dùng chốt 2026-09-21". Plan thực thi chỉ áp dụng đúng chỉ định đó.
- **Fix:** thêm `create or replace function public._ghi_so_dieu_chinh(...)` vào đầu `0061` (trước `nap_ton_tam`), đổi đúng một đối số `kho_id`.
- **Files modified:** `supabase/migrations/0061_nap_ton_tam.sql`
- **Verification:** Task 1 gate `GATE-OK`; pgTAP 35 assertion "dòng NT-ZQX-A ghi đúng kho mặc định của chính nó (K1)" và "dòng NT-ZQX-C ghi đúng kho được chọn khi nạp (K2)" chứng minh kho theo dòng có hiệu lực.
- **Committed in:** `c1aa677` (header, Task 1) + `4e69e79` (hàm thật, Task 2)

**2. [Gate cũ của plan không còn khớp sau quyết định #1 — ghi nhận minh bạch, không sửa/skip gate] Task 2's literal automated `<verify>` gate FAILS**
- **Found during:** Task 2, sau khi thêm bản vá `_ghi_so_dieu_chinh` vào `0061`.
- **Vấn đề:** Gate gốc của Task 2 trong `05-04-PLAN.md` đếm số dòng `insert into public.kho_movement`/`update public.ton_kho` trong TOÀN BỘ file, kỳ vọng bằng 0 — gate này được viết TRƯỚC KHI biết Task 1 sẽ fire điều kiện dừng và người dùng sẽ quyết định vá `_ghi_so_dieu_chinh` ngay trong cùng file. Bản vá đó, đúng theo chỉ định, chứa một `insert into public.kho_movement` hợp lệ (đường ghi sổ đã được ủy quyền qua `ghi_so_chung_tu`, không phải `nap_ton_tam` ghi thẳng) — nên gate đếm toàn file trả về 1, không phải 0.
- **Đã KHÔNG làm:** không sửa/nới lỏng câu lệnh gate, không xóa comment để né grep, không bỏ qua bước kiểm.
- **Đã làm thay:** chạy đúng gate gốc, xác nhận nó in `GATE-FAIL` (không phải `GATE-OK`), rồi chạy một phép kiểm phạm vi hẹp hơn để xác minh đúng TINH THẦN của acceptance criteria (nguyên tắc kiến trúc số 1/2 — `nap_ton_tam` không ghi thẳng): quét CHỈ phần thân hàm `nap_ton_tam` (từ `create or replace function public.nap_ton_tam(` tới `$$;` khớp), kết quả đếm `insert into public.kho_movement`/`update public.ton_kho` bên trong đó = 0. `nap_ton_tam` chỉ `insert` vào `chung_tu`/`chung_tu_dong` rồi `perform ghi_so_chung_tu` — đúng nguyên tắc kiến trúc số 1 và 2, không có ghi thẳng nào từ RPC này.
- **Files modified:** không sửa gì thêm ngoài những gì Task 2 đã yêu cầu.
- **Verification:** lệnh quét phạm vi hẹp (`awk` giới hạn thân hàm `nap_ton_tam` + `grep -v "^\s*--"`) trả về `0`; toàn bộ acceptance criteria còn lại của Task 2 (không `exception when others` thật, có `42501` + `<> 'quan_ly'`, có `jsonb_array_length(v_dat) = 0`, đủ ba câu `revoke`/`grant`/`comment` với chữ ký `(jsonb, uuid, boolean)`) đều đúng.
- **Committed in:** `4e69e79`, ghi rõ trong thân commit message.

---

**Total deviations:** 2 — cả hai đều là hệ quả trực tiếp của quyết định người dùng đã duyệt trước khi Task 1 chạy, không phải phát hiện mới cần hỏi lại. Không có scope creep — không thêm chức năng nào ngoài phạm vi 05-04-PLAN.md.
**Impact on plan:** Deviation #2 là một gate lỗi thời do phát sinh từ deviation #1 (đã được người dùng phê duyệt trước khi thực thi) — không phải một câu hỏi mới cần STOP, vì hướng giải quyết đã được orchestrator truyền đạt tường minh cùng lý do an toàn đã đo trước.

## Issues Encountered

- Lần viết pgTAP đầu tiên đếm nhầm 19 assertion trong khi thực tế viết ra 21 câu `select is/ok/throws_ok` — sửa `select plan(19)` thành `select plan(21)` trước khi commit, xác nhận lại bằng `grep -Ec "^select (is|ok|throws_ok)\("` khớp đúng `plan(N)`.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào cần thiết cho plan này.

## Next Phase Readiness

- Migration `0061` và pgTAP `35` đã sẵn sàng để **plan 05-05** đẩy lên cloud và chạy thật (`db:push` + `db:test:linked`/`psql` trực tiếp) — plan này KHÔNG chạy bất kỳ SQL nào trên database thật, đúng ràng buộc "chỉ một plan đẩy schema trong Phase 5".
- Sau khi 05-05 đẩy `0061` lên cloud, `nap_ton_tam` sẵn sàng cho **05-10** (route upload Excel `/api/ton-kho/nap-tam` + `provisional-stock-preview.tsx`) gọi trực tiếp — hợp đồng jsonb (`da_nap`/`dat`/`bo_qua`/`so_loi`/`chi_tiet_dat`/`chi_tiet_bo_qua`/`loi`) đã khớp hình dạng UI `cost-import.tsx` đang có sẵn.
- **Cần dữ liệu thật để chạy nạp tồn thật:** `data/kiotviet/` vẫn chỉ có README (file `DanhSachSanPham_KV….xlsx` thật chưa có trên máy này) — không chặn việc đẩy schema, nhưng chặn UAT nạp tồn thật của 05-10.
- **Phase 6 cần biết:** lọc chứng từ nạp tạm bằng `ghi_chu like '[NAP_TON_TAM]%'` và `loai_ct = 'DIEU_CHINH'` — kiểm kê thật sẽ sinh phiếu `DIEU_CHINH` khác (không có tiền tố này) đè lên, không xóa chứng từ nạp tạm.

## Known Stubs

Không có stub — RPC và pgTAP đầy đủ chức năng theo đặc tả, chỉ CHƯA được thực thi trên database thật (việc của 05-05).

## Threat Flags

Không có threat mới ngoài `<threat_model>` của `05-04-PLAN.md` — T-05-14..T-05-19, T-05-SC đã được che theo đúng kế hoạch (chặn vai trò 42501, bỏ qua mã đã có `kho_movement`, chứng từ rỗng không tạo, không ghi thẳng `ton_kho`/`kho_movement`, tiền tố `[NAP_TON_TAM]` chống nhầm lẫn với kiểm kê thật).

## Self-Check: PASSED

- FOUND: supabase/migrations/0061_nap_ton_tam.sql
- FOUND: supabase/tests/35_nap_ton_tam_test.sql
- FOUND: .planning/phases/05-ton-kho-tong-quan/05-04-SUMMARY.md
- FOUND commit: c1aa677
- FOUND commit: 4e69e79
- FOUND commit: d226a77

---
*Phase: 05-ton-kho-tong-quan*
*Completed: 2026-09-21*
