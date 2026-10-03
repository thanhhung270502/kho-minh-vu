---
phase: 18-don-nhieu-nguoi-nhan
plan: 02
subsystem: database
tags: [postgres, supabase, rpc, pgtap, migration]
requires: ["18-01"]
provides:
  - "RPC đọc người nhận từ bảng nối (danh_sach_don, chi_tiet_don, dong_don, chi_tiet_chung_tu)"
  - "danh_sach_don lọc p_nguoi_nhan_id; nội bộ = doi_tac_id IS NULL"
  - "tao_phieu_xuat_tu_don chép người nhận đơn + dòng sang hóa đơn"
  - "nguoi_nhan_dong_chung_tu(p_id)"
affects: [18-03, 18-04, 18-05, 18-06]
tech-stack:
  added: []
  patterns: ["hai mảng song song từ một lateral subquery order by thu_tu, nguoi_nhan_id", "security invoker cho RPC đọc phụ để RLS tự áp"]
key-files:
  created:
    - supabase/migrations/0091_nguoi_nhan_rpc_doc.sql
    - supabase/tests/109_nguoi_nhan_rpc_doc_test.sql
  modified:
    - supabase/tests/30_don_noi_bo_test.sql
    - supabase/tests/98_phan_tich_ton_kho_test.sql
key-decisions:
  - "Phân tích tồn: 'bán cho đối tác' = doi_tac_id IS NOT NULL hoặc hóa đơn chưa có người nhận nào (tương đương phép thử cũ sau backfill); đơn mở dùng dh.doi_tac_id IS NOT NULL"
  - "Khối tự kiểm cuối 0091 dò thêm bí danh goc (hóa đơn gốc trong phan_tich_ton_kho), ngoài dh/ct/v_don/v_ct của plan"
  - "danh_sach_chung_tu/the_kho_san_pham dựng chuỗi 'Nội bộ — ...' bằng scalar subquery (tính sau limit) thay vì lateral"
requirements-completed: [NNHAN-03, NNHAN-05, NNHAN-06]
duration: 30min
completed: 2026-10-03
---

# Phase 18 Plan 02: RPC đọc người nhận từ bảng nối Summary

Migration 0091 đổi đủ 8 RPC đọc/chép sang bảng nối 0090, thêm `nguoi_nhan_dong_chung_tu`; pgTAP 109 (32 test) xanh, toàn bộ pgTAP 51 file / 827 test xanh.

## Hoàn thành

- Task 1 (commit 509c3c4): 0091 áp lên DB local. Câu dò cột cũ trả 0; `danh_sach_don` chỉ một overload; mọi hàm drop+create có execute cho authenticated, không cho anon. Không đụng `hoan_thanh_don`, `ghi_so_chung_tu`, `dong_chung_tu`.
- Task 2 (commit 6a675b1): pgTAP 109; 30 và 98 sửa phần đọc cột cũ (giá trị kỳ vọng nghiệp vụ của 98 không đổi). Không cần sửa 21/24/25/27/31.
- `npm run test:concurrency`: TẤT CẢ ĐÚNG.

## Chữ ký trả mới (để 18-03 đối chiếu)

- `danh_sach_don(p_trang_thai, p_doi_tac_id, p_tu_ngay, p_den_ngay, p_tu_khoa, p_trang, p_kich_thuoc, p_loai_nhan, p_nguoi_nhan_id uuid default null)` → ... `doi_tac_id, ten_doi_tac, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], so_dong, tong_so_luong_dat, tong_so_luong_da_xuat, ho_ten_nguoi_tao, ghi_chu, created_at, tong_so_dong`
- `chi_tiet_don(uuid)` → ... `doi_tac_id, ma_doi_tac, ten_doi_tac, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], ghi_chu, ... hoa_don_id, so_hoa_don`
- `dong_don(uuid)` → cột cũ + CUỐI `nguoi_nhan_id uuid, ten_nguoi_nhan text` (NULL = hàng chung)
- `chi_tiet_chung_tu(uuid)` → cột cũ, hai cột cuối đổi thành `nguoi_nhan_ids uuid[], ten_nguoi_nhan text[]`
- `nguoi_nhan_dong_chung_tu(p_id uuid)` → `(chung_tu_dong_id uuid, nguoi_nhan_id uuid, ten_nguoi_nhan text)`, chỉ dòng đã gán
- `danh_sach_chung_tu`, `the_kho_san_pham`, `phan_tich_ton_kho`, `nhip_ban_theo_ngay`: kiểu trả giữ nguyên.

## Deviations from Plan

**1. [Rule 2] Khối tự kiểm và test dò thêm bí danh `goc`**
- Issue: `phan_tich_ton_kho` có `goc.nguoi_nhan_id is null` (hóa đơn gốc của phiếu trả khách), regex trong plan không bắt.
- Fix: thay bằng phép thử bảng nối cho `goc`, thêm `goc` vào regex ở 0091 và 109.

Không còn lệch khác. Không cần checkpoint 0088 (đã xác nhận ở 18-01).

## Known Stubs

None.

## Self-Check: PASSED

- 0091, 109, 18-02-SUMMARY tồn tại; commit 509c3c4, 6a675b1 có trong git log.
