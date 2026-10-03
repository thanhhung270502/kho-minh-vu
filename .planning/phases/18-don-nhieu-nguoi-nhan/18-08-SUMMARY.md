---
phase: 18-don-nhieu-nguoi-nhan
plan: 08
subsystem: verification
tags: [uat, recipients, print, keyboard]
requires: ["18-01", "18-02", "18-03", "18-04", "18-05", "18-06", "18-07"]
provides:
  - "Bộ kiểm tự động toàn phần xanh sau wave 4"
  - "UAT 11 bước Phase 18 — người dùng xác nhận đạt 03/10/2026"
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/features/sales-order/components/recipient-picker.tsx
key-decisions:
  - "Ô nhân viên phụ trách của chế độ Đối tác cũng dùng onEnterWhenEmpty (Enter khi ô tìm rỗng = tạo đơn)"
requirements-completed: [NNHAN-01, NNHAN-02, NNHAN-03, NNHAN-04, NNHAN-05, NNHAN-06]
duration: 45min
completed: 2026-10-03
---

# Phase 18 Plan 08: Cổng cuối Summary

Bộ kiểm tự động xanh toàn phần; UAT 11 bước trên trình duyệt đạt sau một bản sửa nhỏ; người dùng xác nhận "đạt".

## Task 1 — Bộ kiểm tự động

| Lệnh | Kết quả |
|---|---|
| `npm run check` | exit 0 (cả sau bản sửa f8a57f1) |
| `npx tsx scripts/test-pure-functions.ts` | tất cả assert đạt |
| `supabase test db` | 51 file / 827 test PASS (gồm 108, 109) |
| `npm run test:concurrency` | TẤT CẢ ĐÚNG |
| `npx tsx scripts/test-route-permissions.ts` | 267/267 ô đúng |

Quét mã mô hình cũ: chỉ còn `recipientKind` (bộ lọc loại người nhận — hợp lệ); `nguoi_nhan_id` không còn ngoài `api/`, `types.ts`, `schemas/`.

## Task 2 — Kiểm trên trình duyệt (Quản lý demo, Supabase local)

| # | Kết quả |
|---|---|
| 1 | Đơn/hóa đơn cũ hiện đúng người nhận (backfill giữ nguyên; PX26-000002 vốn ghi "Văn phòng demo" khác đơn gốc — dữ liệu cũ) |
| 2 | Tạo đơn nội bộ một người chỉ bàn phím (gõ tên → Enter → Enter) → DH26-000005; lưới không có cột Người nhận; thêm dòng bằng bàn phím, con trỏ về ô mã |
| 3 | Thêm người thứ hai → cột "Người nhận" + ô ở hàng nhập; giá trị dính qua 2 dòng liên tiếp |
| 4 | Gán dòng cho người ngoài đơn → "Đã thêm Văn phòng demo vào người nhận của đơn." + tag ở đầu đơn (D1) |
| 5 | Bỏ người đang ở dòng → chặn, nêu mã hàng (06410KSP900, 06410KWB600); bỏ người không dùng → lưu (DELETE qua PostgREST OK) |
| 6 | Đơn Đối tác + 2 nhân viên → DH26-000006; chuyển sang Nội bộ giữ nhân viên |
| 7 | Lọc `?nhan_vien=<uuid>` chỉ ra đơn có người đó; "Xóa bộ lọc" xóa cả ô |
| 8 | Phiếu đi lấy hàng: một tờ, đầu phiếu liệt kê người nhận, cột "Người nhận" ("Chung" ở dòng chung), Người đặt + In lúc, colSpan 7/5 đúng |
| 9 | Hoàn thành → PX26-000005: Duyệt đơn hiện tag người nhận (không ô sửa), cột Người nhận khớp dòng đơn; phiếu giao hàng liệt kê người nhận |
| 10 | 375px: đơn, hóa đơn, danh sách không tràn ngang |
| 11 | Console: không lỗi mới; 400 chỉ là phản hồi có chủ đích (chặn bỏ người, đòi lý do xuất âm) |

## Deviations

- **[Rule 1 — bug] Enter ở ô nhân viên phụ trách (chế độ Đối tác) gỡ người vừa chọn thay vì tạo đơn** — `RecipientPicker` chỉ truyền `onEnterWhenEmpty` cho chế độ Nội bộ. Sửa: truyền cả cho chế độ Đối tác. Commit `f8a57f1`.
- Chưa kiểm bằng tài khoản thủ kho (dùng quản lý cho cả lượt).
- Quan sát (không sửa): trang in phiếu lấy hàng ở 375px làm viewport giãn ~406px (bảng 7 cột A4) — không vỡ khung.
- Dữ liệu thử trên DB local: DH26-000005 (hoàn thành → PX26-000005, xuất âm 3 mã, lý do "Hàng đã về, chưa nhập phiếu"), DH26-000006 (đơn tạm Nội bộ).

## Self-Check: PASSED
