---
phase: 20-giao-dien-3b
plan: 01
subsystem: database
tags: [postgres, rpc, search, rls, pgtap]
requires: []
provides:
  - "public.tim_kiem_toan_cuc(p_tu_khoa text, p_gioi_han integer default 5) — RPC cho ô tìm ⌘K"
affects: [20-09]
key-files:
  created:
    - supabase/migrations/0092_tim_kiem_toan_cuc.sql
    - supabase/tests/110_tim_kiem_toan_cuc_test.sql
decisions:
  - "SECURITY INVOKER để RLS chung_tu tự lọc phạm vi kho"
  - "Bỏ CHUYEN_KHO và DIEU_CHINH khỏi kết quả (D-07)"
metrics:
  completed: 2026-10-04
requirements-completed: [UI3B-02]
---

# Phase 20 Plan 01: tim_kiem_toan_cuc Summary

RPC SECURITY INVOKER gộp bốn nhánh union all (mã hàng, chứng từ, đơn đặt, đối tác), xếp mã khớp tuyệt đối trước, tìm không dấu, RLS tự lọc kho.

## Chữ ký hàm thật

`public.tim_kiem_toan_cuc(p_tu_khoa text, p_gioi_han integer default 5)` trả bảng
`(loai text, id uuid, nhan text, phu text, loai_ct text, trang_thai text, xep_hang integer)`.
`loai` in `san_pham | chung_tu | don_dat | doi_tac`. Từ khóa dưới 2 ký tự trả 0 dòng.
`p_gioi_han` kẹp trong 1..10, áp cho từng loại. Chỉ `authenticated` có execute.
Kết quả không có order by tổng; UI nhóm theo `loai`, trong từng loại đã sắp theo `xep_hang`.

## Tests

pgTAP 110: 13 assert, PASS (kế hoạch ghi 12-14). Fixture: thukho1 chỉ có kho K1, nên
phiếu "kho kia" là K2 (thukho1 thấy 1 phiếu, quanly thấy 2). Tiền tố ZQX-TK-.

## Deviations from Plan

- [Rule 3] Worktree được tạo từ commit cũ, chưa có plan phase 20; đã `git merge --ff-only feature/phase-20-giao-dien-3b` vào nhánh worktree để đọc plan.
- Enum `trang_thai_ddh` thực tế là TAM/DA_XAC_NHAN/HOAN_THANH/DA_HUY; hàm chỉ ép sang text nên không ảnh hưởng.
- Test RED lần đầu đỏ vì lỗi fixture (ép kiểu), không phải vì thiếu hàm; đã sửa cùng commit GREEN.

## Lưu ý triển khai

0092 mới áp LOCAL bằng psql, CHƯA vào lịch sử migration (plan 20-06 đồng bộ), CHƯA lên cloud.

## Known Stubs

None.

## Self-Check: PASSED
