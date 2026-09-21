---
phase: 05-ton-kho-tong-quan
plan: 03
subsystem: database
tags: [postgres, plpgsql, pgtap, rpc, supabase]

requires:
  - phase: 05-00
    provides: "Xác nhận database ở migration 0057, không có migration lạ ≥ 0058; 05-LIVE-DEFS.md ghi sẵn định nghĩa đang chạy của nhat_ky_sua_nguon_check"
provides:
  - "RPC public.de_xuat_dinh_muc — đề xuất định mức tồn tối thiểu từ lịch sử bán KiotViet, kèm căn cứ (so_ngay_du_lieu, so_lan_ban, nguon_de_xuat)"
  - "RPC public.dat_dinh_muc(uuid[]) — duyệt hàng loạt, ghi san_pham.ton_toi_thieu, số do server tự tính lại"
  - "Constraint nhat_ky_sua_nguon_check mở rộng thêm giá trị 'dinh_muc'"
  - "pgTAP 34_dinh_muc_test.sql — 16 assertion phủ ba nhánh nguồn + chặn vai trò + ghi nhật ký"
affects: [05-09-plan-man-duyet-dinh-muc, 05-10-plan-man-duoi-dinh-muc, 05-05-plan-day-migration]

tech-stack:
  added: []
  patterns:
    - "Hệ đề xuất — người duyệt: RPC đọc STABLE (không ghi) + RPC ghi SECURITY DEFINER tự tính lại giá trị, không tin tham số client (khuôn 0035 goi_y_cong_doan_theo_duoi/ap_dung_goi_y_cong_doan)"
    - "Cửa sổ dữ liệu tính trên TOÀN BỘ bảng lưu trữ trong một CTE dùng chung cho mọi dòng, không tính riêng từng mã"

key-files:
  created:
    - supabase/migrations/0060_de_xuat_dinh_muc.sql
    - supabase/tests/34_dinh_muc_test.sql
  modified: []

key-decisions:
  - "Công thức định mức theo đúng 05-CONTEXT.md Claude's Discretion: theo_ma = least(ceil(tong_da_ban/so_ngay*7), tong_da_ban) sàn 1; trung_binh_nhom = ceil(avg) các mã theo_ma cùng nhóm; khong_du_lieu = 0"
  - "dat_dinh_muc chỉ nhận uuid[], đọc lại de_xuat_dinh_muc(null,false,1,5000) ngay trong câu UPDATE — không có đường nào để client đẩy một ton_toi_thieu tùy ý"
  - "Constraint nhat_ky_sua_nguon_check drop/add với danh sách 9 giá trị đọc trực tiếp từ cloud (05-LIVE-DEFS.md) + 1 giá trị mới 'dinh_muc', không gõ lại theo trí nhớ hay theo file 0044 cũ trong repo"

patterns-established: []

requirements-completed: []

duration: 12min
completed: 2026-09-21
---

# Phase 5 Plan 3: Đề xuất & duyệt định mức tồn tối thiểu Summary

**Cặp RPC `de_xuat_dinh_muc`/`dat_dinh_muc` suy định mức tồn tối thiểu từ 4.732 dòng lịch sử bán KiotViet (1.223 mã có lịch sử, 2.043 mã theo trung bình nhóm), kèm căn cứ đọc được cho người duyệt — chưa chạy trên database nào.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3/3 hoàn thành
- **Files modified:** 2 (một file mới cho migration, một file mới cho pgTAP)

## Accomplishments

- Đọc đúng ràng buộc `nhat_ky_sua_nguon_check` **đang chạy trên cloud** (do phiên điều phối đọc hộ, dán vào `05-LIVE-DEFS.md`) thay vì tin theo file `0044` cũ trong repo — xác nhận Phase 4 không thêm giá trị `nguon` nào, nên danh sách chỉ cần cộng đúng một giá trị mới `'dinh_muc'`.
- `de_xuat_dinh_muc`: RPC chỉ đọc, suy định mức theo ba nhánh (`theo_ma` / `trung_binh_nhom` / `khong_du_lieu`), luôn trả kèm `so_ngay_du_lieu`, `so_lan_ban`, `tong_da_ban` để màn duyệt (plan sau) hiện được độ tin cậy từng dòng — đúng yêu cầu bắt buộc của D-04.
- `dat_dinh_muc(uuid[])`: RPC ghi duy nhất cho `san_pham.ton_toi_thieu` hàng loạt — không nhận con số từ client, tự đọc lại `de_xuat_dinh_muc` ngay trong câu `UPDATE`; chặn vai trò (42501), chặn quá 1000 id (23514), ghi `app.nguon_sua = 'dinh_muc'` để trigger nhật ký 0027 bắt đúng.
- pgTAP `34_dinh_muc_test.sql`: 16 assertion phủ đủ ba nhánh nguồn, bất biến "đề xuất không tự ghi đè", ghi đúng một dòng nhật ký, và hai `throws_ok` chặn thủ kho/chỉ xem.

## Task Commits

Mỗi task một commit atomic:

1. **Task 1: Đọc ràng buộc `nhat_ky_sua_nguon_check` đang chạy trên cloud** - `16ed1fe` (feat)
2. **Task 2: Viết hai RPC `de_xuat_dinh_muc` và `dat_dinh_muc`** - `5420d32` (feat)
3. **Task 3: Viết pgTAP `34_dinh_muc_test.sql`** - `ce5f63f` (test)

## Files Created/Modified

- `supabase/migrations/0060_de_xuat_dinh_muc.sql` - Header dán nguyên văn `pg_get_constraintdef` đọc từ cloud + drop/add constraint `nhat_ky_sua_nguon_check`; hai hàm `de_xuat_dinh_muc` (đọc) và `dat_dinh_muc` (ghi) với đầy đủ `revoke`/`grant`/`comment`
- `supabase/tests/34_dinh_muc_test.sql` - pgTAP 16 assertion: nhánh `theo_ma` (DM-ZQX-A, 3 hóa đơn), nhánh `trung_binh_nhom` (DM-ZQX-B cùng nhóm A), nhánh `khong_du_lieu` (DM-ZQX-C, nhóm riêng không mã nào từng bán), bất biến trước/sau duyệt, nhật ký, chặn vai trò

## Decisions Made

Không có quyết định mới ngoài phạm vi đã khóa ở `05-CONTEXT.md` (Claude's Discretion về công thức) — thực thi đúng công thức đã chốt ở bước lập kế hoạch (`<design_decisions>` của `05-03-PLAN.md`), không tự đổi hằng số `v_so_ngay_phu := 7` hay các nhánh nguồn.

## Deviations from Plan

None - plan executed exactly as written.

Một điểm chú ý không phải deviation nhưng đáng ghi: Task 1 và Task 2 cùng sửa một file (`0060_de_xuat_dinh_muc.sql`). Thay vì viết trọn file trong một commit, file được viết theo hai giai đoạn khớp đúng ranh giới task của plan (giai đoạn 1 = header + constraint; giai đoạn 2 = thêm hai hàm) để giữ nguyên tắc "mỗi task một commit atomic" của `task_commit_protocol`.

## Issues Encountered

None.

## User Setup Required

None - không cần cấu hình dịch vụ ngoài nào.

## Next Phase Readiness

**SQL trong plan này CHƯA chạy trên bất kỳ database nào** (máy thực thi không có kết nối database, đúng ràng buộc của `05-00-SUMMARY.md`). Đẩy migration `0060` lên cloud và chạy pgTAP `34` thật là việc của **plan 05-05** (ràng buộc: chỉ một plan được đẩy schema trong Phase 5).

Sẵn sàng cho các plan Wave 3 sau (màn duyệt định mức `/ton-kho/dinh-muc`, màn dưới định mức): `de_xuat_dinh_muc` đã trả đủ cột căn cứ để hiện độ tin cậy trên UI, `dat_dinh_muc` đã sẵn chữ ký `(uuid[])` khớp đúng khuôn `rowSelection` của `stage-suggestions.tsx` mà `05-PATTERNS.md` chỉ định làm analog.

**Không đánh dấu TQAN-02 hoàn thành trong REQUIREMENTS.md** dù frontmatter của `05-03-PLAN.md` liệt kê — theo đúng chỉ định của orchestrator: chưa có màn hình nào (WU-9 màn duyệt, WU-10 màn dưới định mức) hiển thị các RPC này. Đây là tiền lệ giống hệt cách `05-02-SUMMARY.md` xử lý TON-02.

## Self-Check: PASSED

- FOUND: supabase/migrations/0060_de_xuat_dinh_muc.sql
- FOUND: supabase/tests/34_dinh_muc_test.sql
- FOUND commit: 16ed1fe
- FOUND commit: 5420d32
- FOUND commit: ce5f63f

---
*Phase: 05-ton-kho-tong-quan*
*Completed: 2026-09-21*
