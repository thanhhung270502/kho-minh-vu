---
phase: 18-don-nhieu-nguoi-nhan
plan: 01
subsystem: database
tags: [postgres, supabase, rls, pgtap, migration, trigger]
requires: []
provides:
  - "don_dat_hang_nguoi_nhan / chung_tu_nguoi_nhan: bảng nối người nhận (nguồn sự thật)"
  - "don_dat_hang_dong.nguoi_nhan_id, chung_tu_dong.nguoi_nhan_id"
  - "RPC tao_don(doi_tac, nguoi_nhan_ids), dat_nguoi_nhan_don(don, doi_tac, nguoi_nhan_ids)"
  - "Bất biến D1 (dòng ⊆ đơn), D3 (đơn nội bộ >= 1 người), chặn bỏ người đang gán ở dòng"
affects: [18-02, 18-03, 18-04, 18-05]
tech-stack:
  added: []
  patterns: ["constraint trigger hoãn cho bất biến cuối transaction", "bảng nối chỉ ghi qua RPC security definer"]
key-files:
  created:
    - supabase/migrations/0090_don_nhieu_nguoi_nhan.sql
    - supabase/tests/108_don_nhieu_nguoi_nhan_test.sql
  modified:
    - supabase/tests/30_don_noi_bo_test.sql
key-decisions:
  - "Trigger D1 dùng FOR UPDATE (không FOR SHARE) trên hàng đơn để thu_tu không trùng khi thêm dòng đồng thời"
  - "tao_don gọi sinh_so_dh trước khi kiểm đầu vào để thiếu quyền ra 42501 đúng"
  - "Không ghi nhật ký sửa cho thay đổi người nhận (orchestrator đã chốt)"
requirements-completed: [NNHAN-01, NNHAN-02, NNHAN-06]
duration: 25min
completed: 2026-10-03
---

# Phase 18 Plan 01: Mô hình DB nhiều người nhận Summary

Migration 0090 dựng bảng nối người nhận cho đơn và hóa đơn, trigger bất biến D1/D3 ở database, và hai RPC ghi `tao_don` / `dat_nguoi_nhan_don`; pgTAP 108 (41 test) chứng minh.

## Hoàn thành

- Task 1 (commit febe9f5): 0090 — bảng nối + RLS chỉ đọc + revoke ghi, cột `nguoi_nhan_id` trên dòng đơn/dòng chứng từ, backfill có khối tự kiểm (3 đơn cũ chép sang, không raise), drop `ck_ddh_mot_nguoi_nhan`, trigger D1, trigger chặn xóa người còn gán ở dòng, constraint trigger hoãn D3, hai RPC. Đã áp lên DB local.
- Task 2 (commit cba18ba): pgTAP 108 xanh 41/41; file 30 sửa hai assertion bị CHECK cũ làm đỏ (thay bằng kiểm tra CHECK đã bỏ và trigger D3 tồn tại, giữ plan 26). Toàn bộ `supabase test db`: 50 file, 795 test PASS.

## Thông tin cho 18-02

- Số migration thực dùng: **0090** (không nhánh nào khác dùng 009x).
- `git show feature/quy-chuan-ma-d:supabase/migrations/0088_combo.sql | grep -n tao_phieu_xuat_tu_don` → dòng 559: `v_ct := public.tao_phieu_xuat_tu_don(p_don_id);` (nhánh quy chuẩn chỉ gọi hàm này, không định nghĩa lại ở 0088 theo grep).
- Cột `nguoi_nhan_id` cũ vẫn còn dữ liệu nhưng ngừng dùng; các RPC đọc và `tao_phieu_xuat_tu_don` vẫn đọc cột cũ cho tới 0091. Đơn nội bộ tạo mới (cột cũ NULL) sẽ hiện sai ở các RPC đọc đó cho tới khi 18-02 đổi.
- Insert trực tiếp đơn nội bộ không qua `tao_don` (code app hiện tại) sẽ lỗi 23514 ở commit vì D3 hoãn — UI phải chuyển sang `tao_don` (plan sau).

## Deviations from Plan

None - plan executed as written. (Bảng nối thêm vào backfill khi chạy: 3 dòng.)

## Known Stubs

None.

## Self-Check: PASSED

- 0090 và 108 tồn tại; commit febe9f5, cba18ba có trong git log.
