---
phase: 20-giao-dien-3b
plan: 02
subsystem: database
tags: [postgres, rpc, pgtap, dashboard]
requires: []
provides:
  - tong_quan_chi_so, nhap_xuat_theo_ngay, khong_luan_chuyen RPC
  - ton_theo_nhom.tong_so_luong
affects: [20-06, 20-10]
key-files:
  created:
    - supabase/migrations/0093_tong_quan_3b.sql
    - supabase/tests/111_tong_quan_3b_test.sql
  modified:
    - supabase/tests/93_ton_theo_nhom_test.sql
requirements-completed: [UI3B-03, UI3B-04]
duration: 25min
completed: 2026-10-04
---

# Phase 20 Plan 02: RPC Tổng quan 3b Summary

Bốn RPC SECURITY DEFINER cho trang Tổng quan 3b, giá trị tồn chỉ ra khi có quyền giá vốn, pgTAP 111 (35) + 93 (26) xanh.

## Chữ ký hàm (cho mapper plan 20-06)

Tất cả kiểm `co_quyen('xem_dashboard')` (42501), `p_ngay date default ngày VN hôm nay`.

- `tong_quan_chi_so(p_ngay)` returns one row: `xem_gia_von boolean, gia_tri_ton numeric, gia_tri_ton_thang_truoc numeric, tong_sl_ton numeric, tong_sl_ton_thang_truoc numeric, xu_huong_ton numeric[30], ma_kinh_doanh bigint, ma_moi_thang bigint, xu_huong_ma_kd bigint[30], phieu_xuat_tb_ngay numeric, cho_ghi_so bigint, cho_ghi_so_nhap bigint, cho_ghi_so_xuat bigint, cho_ghi_so_cu_nhat_ngay integer, xu_huong_cho_ghi_so bigint[14], ton_am_theo_kho jsonb ([{ten_kho, so_ma}]), vi_du_duoi_dinh_muc text[]`
- `nhap_xuat_theo_ngay(p_so_ngay integer, p_ngay)` -> `(ngay date, so_phieu_nhap bigint, so_phieu_xuat bigint, sl_nhap numeric, sl_xuat numeric)`, cũ -> mới; p_so_ngay chỉ 7/30/90 (22023). SL là giá trị tuyệt đối.
- `khong_luan_chuyen(p_so_ngay integer default 30, p_gioi_han integer default 10, p_ngay)` -> `(san_pham_id uuid, ma_hang text, ten_hang text, so_ngay integer, ton numeric)`
- `ton_theo_nhom(p_theo, p_kho_id)` -> các cột cũ + `tong_so_luong numeric` (cuối).

## Định nghĩa

- `gia_tri_ton` = sum(max(tồn mọi kho, 0) * gia_von hiện tại) trên mọi mã; null khi `co_quyen_xem_gia_von()` = false (khi đó `xu_huong_ton` là chuỗi SL thay vì giá trị).
- Chuỗi lùi (D-09) là ƯỚC TÍNH: giá trị cuối ngày T = hiện tại - Σ biến động kho_movement có ngày VN > T, theo giá vốn hiện tại.
- Phiếu chờ = NHAP/XUAT/TRA_NCC/TRA_KHACH ở NHAP_LIEU (không KIEM_KE).
- `nhap_xuat_theo_ngay.so_phieu_xuat` dùng đúng định nghĩa `nhip_ban` (khoá bằng test).

## Deviations from Plan

None - plan executed as written. Worktree được fast-forward lên nhánh feature/phase-20 trước khi làm (worktree sinh ra từ commit cũ chưa có file plan).

## Lưu ý triển khai

0093 chỉ áp LOCAL bằng psql, chưa vào lịch sử migration của supabase, chưa lên cloud. `src/types/database.types.ts` chưa sinh lại (không thuộc files_modified).

## Self-Check: PASSED
