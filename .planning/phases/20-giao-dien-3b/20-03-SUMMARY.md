---
phase: 20-giao-dien-3b
plan: 03
subsystem: database
tags: [postgres, rpc, pgtap, don-dat-hang]
requires: [0090, 0091]
provides: [dem_don_theo_trang_thai, them_dong_don]
key-files:
  created:
    - supabase/migrations/0094_don_dat_dem_va_cong_don.sql
    - supabase/tests/113_don_dat_dem_cong_don_test.sql
requirements-completed: [UI3B-05, UI3B-06]
---

# Phase 20 Plan 03: Đếm đơn theo trạng thái và cộng dồn dòng đơn Summary

Hai RPC cho Đơn đặt: số đếm 4 trạng thái dùng đúng bộ lọc của `danh_sach_don`, và thêm dòng đơn cộng dồn atomic theo (mã, người nhận dòng) với `is not distinct from`.

## Chữ ký thật

- `dem_don_theo_trang_thai(p_doi_tac_id uuid = null, p_tu_ngay date = null, p_den_ngay date = null, p_tu_khoa text = null, p_loai_nhan text = null, p_nguoi_nhan_id uuid = null) returns table (trang_thai trang_thai_ddh, so_don bigint)` — SECURITY DEFINER, stable; luôn đủ 4 hàng.
- `them_dong_don(p_don_id uuid, p_san_pham_id uuid, p_so_luong numeric, p_nguoi_nhan_id uuid = null) returns table (dong_id uuid, da_cong_don boolean, so_luong_moi numeric)` — SECURITY INVOKER; chỉ đơn TAM + quyền `tao_don`, khóa đơn FOR UPDATE.

## Commits

- 76d04bb test(don-dat): pgTAP 113 (đỏ)
- 7323e37 feat(don-dat): migration 0094 (kèm sửa grant delete bảng tạm của test)

## Deviations from Plan

- Worktree được tạo từ base cũ (b242ce3) chưa có tài liệu phase 20; đã fast-forward lên 4d236e4 trước khi làm. Không ảnh hưởng nội dung.
- Fixture test có 3 đơn TAM (tam1, tam2, cong) thay vì 2, vì cần thêm một đơn riêng cho cộng dồn; assertion TAM = 3.

## Lưu ý triển khai

0094 chỉ áp LOCAL bằng psql, chưa vào lịch sử migration của supabase, chưa lên cloud. Test 113 (27/27), 108, 109 xanh.

## Self-Check: PASSED
