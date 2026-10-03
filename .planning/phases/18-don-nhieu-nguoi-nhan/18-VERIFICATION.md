---
phase: 18-don-nhieu-nguoi-nhan
verified: 2026-10-03T00:00:00Z
status: passed
score: 6/6 requirements verified
---

# Phase 18: Đơn nhiều người nhận — Verification

**Goal:** Một đơn (Nội bộ/Đối tác) giao được cho nhiều người nhận, từng dòng có người nhận riêng, xuyên suốt danh sách, phiếu lấy hàng, hóa đơn.
**Status:** passed

## Requirements coverage

| ID | Status | Evidence |
|---|---|---|
| NNHAN-01 | SATISFIED | Bảng `don_dat_hang_nguoi_nhan` / `chung_tu_nguoi_nhan` (RLS bật); `recipient-picker.tsx`, `order-recipient-field.tsx`; UAT bước 2-6 (D1 tự thêm, D3 cả hai chế độ) |
| NNHAN-02 | SATISFIED | Cột `nguoi_nhan_id` trên `don_dat_hang_dong` và `chung_tu_dong`; `order-line-entry-row.tsx`, `order-line-columns.tsx`; UAT bước 3-5 (chặn bỏ người đang dùng, nêu mã hàng) |
| NNHAN-03 | SATISFIED | `order-filter-panel.tsx`, `order-table-body.tsx`; UAT bước 7 |
| NNHAN-04 | SATISFIED | `picking-print-template.tsx` (đầu phiếu + cột Người nhận); UAT bước 8 |
| NNHAN-05 | SATISFIED | `chung_tu_nguoi_nhan`, `issue-detail.tsx`, `delivery-print-template.tsx`; UAT bước 9; migration 0091 RPC đọc |
| NNHAN-06 | SATISFIED | Local DB: 0 đơn / 0 chứng từ có `nguoi_nhan_id` cũ mà thiếu hàng trong bảng mới (backfill đầy đủ); cột cũ giữ lại theo quyết định |

Mọi ID trong PLAN frontmatter (01-08) đều có trong REQUIREMENTS.md; không có ID mồ côi.

## Kiểm tra đã chạy lại

- pgTAP 108 + 109: 73 test PASS
- `npm run typecheck`: sạch
- `scripts/test-pure-functions.ts`: đạt
- DB local: migration 0090, 0091 đã áp; bảng/cột như trên
- Quét mã: `nguoi_nhan` chỉ còn ở `api/`, `types.ts`, `schemas/`, tầng mapper — đúng quy ước
- 18-08 SUMMARY: check, pgTAP 51 file/827, concurrency, route-permissions 267/267 xanh; UAT 11 bước người dùng duyệt (kèm fix f8a57f1)

## Ghi chú (không chặn)

- Migration 0090/0091 mới chỉ ở local, chưa lên cloud (cần áp khi deploy).
- Chưa UAT bằng tài khoản thủ kho; trang in phiếu lấy hàng ở 375px giãn viewport ~406px (bảng A4 7 cột).
- Không chạy lại build/concurrency/route-permissions trong lượt này, dựa vào kết quả 18-08.
